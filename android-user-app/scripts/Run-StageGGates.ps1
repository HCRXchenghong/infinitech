param(
    [switch]$SkipQualityGates,
    [switch]$RunInstrumentation,
    [switch]$AllowNoDevice,
    [string]$MetricsPath,
    [string]$MetricsUrl,
    [string]$ThresholdPath = "docs/gray/rollout_thresholds.json",
    [string]$DecisionOutputPath = "docs/gray/last_decision.json",
    [string]$AuthBearerToken = $env:GRAY_METRICS_BEARER_TOKEN,
    [switch]$GenerateSignoffReport,
    [string]$SignoffOutputJsonPath = "docs/signoff/release_signoff_report.json",
    [string]$SignoffOutputMarkdownPath = "docs/signoff/release_signoff_report.md",
    [string]$AndroidTestResultPath = "app/build/outputs/androidTest-results/connected/debug/TEST-*-_app-.xml",
    [string]$ManualParityPath = "docs/signoff/manual_parity_status.json",
    [int]$P0Count = -1,
    [int]$P1Count = -1,
    [int]$P2Count = -1
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$targetRoot = $projectRoot

function Use-AsciiWorkspace([string]$rootPath) {
    if ($rootPath -notmatch '[^\x00-\x7F]') {
        return $rootPath
    }

    $preferredMirror = Join-Path $env:USERPROFILE "Desktop\infinite3.0\android-user-app"
    if (Test-Path (Join-Path $preferredMirror "gradlew.bat")) {
        Write-Host "Non-ASCII path detected. Using preferred ASCII mirror:" $preferredMirror
        return $preferredMirror
    }

    $junctionRoot = Join-Path $env:TEMP "android-user-app-ascii"
    if (-not (Test-Path $junctionRoot)) {
        Write-Host "Creating temporary junction for ASCII-safe task execution:" $junctionRoot
        New-Item -ItemType Junction -Path $junctionRoot -Target $rootPath | Out-Null
    }
    return $junctionRoot
}

$targetRoot = Use-AsciiWorkspace $projectRoot

if (Test-Path "C:\Program Files\Android\Android Studio\jbr\bin\java.exe") {
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
}

if ([string]::IsNullOrWhiteSpace($MetricsUrl) -and [string]::IsNullOrWhiteSpace($MetricsPath)) {
    if (-not [string]::IsNullOrWhiteSpace($env:GRAY_METRICS_URL)) {
        $MetricsUrl = $env:GRAY_METRICS_URL
    }
}

if (-not $SkipQualityGates) {
    & powershell -ExecutionPolicy Bypass -File (Join-Path $scriptDir "Run-QualityGates.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "Quality gate step failed with exit code $LASTEXITCODE"
    }
}

$hasMetricInput = (-not [string]::IsNullOrWhiteSpace($MetricsPath)) -or (-not [string]::IsNullOrWhiteSpace($MetricsUrl))
if ($hasMetricInput) {
    $evaluateArgs = @(
        "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $scriptDir "Evaluate-GrayRolloutMetrics.ps1"),
        "-ThresholdPath", $ThresholdPath,
        "-OutputDecisionPath", $DecisionOutputPath
    )

    if (-not [string]::IsNullOrWhiteSpace($MetricsPath)) {
        $evaluateArgs += @("-MetricsPath", $MetricsPath)
    }
    else {
        $evaluateArgs += @("-MetricsUrl", $MetricsUrl)
        if (-not [string]::IsNullOrWhiteSpace($AuthBearerToken)) {
            $evaluateArgs += @("-AuthBearerToken", $AuthBearerToken)
        }
    }

    & powershell @evaluateArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Gray rollout evaluation failed with exit code $LASTEXITCODE"
    }
}

if ($RunInstrumentation) {
    $adb = Get-Command adb -ErrorAction SilentlyContinue
    if ($null -eq $adb) {
        $localAdb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
        if (Test-Path $localAdb) {
            $env:PATH = (Split-Path -Parent $localAdb) + ";" + $env:PATH
            $adb = Get-Command adb -ErrorAction SilentlyContinue
        }
    }
    if ($null -eq $adb) {
        if ($AllowNoDevice) {
            Write-Host "adb not found. Skip instrumentation because -AllowNoDevice is enabled."
            Write-Host "Stage G gate execution finished with skipped instrumentation."
            exit 0
        }
        throw "adb not found. Install Android platform-tools or run without -RunInstrumentation."
    }

    $deviceLines = (& adb devices) | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" }
    if (($null -eq $deviceLines -or $deviceLines.Count -eq 0) -and -not $AllowNoDevice) {
        throw "No connected Android device/emulator found for instrumentation tests."
    }

    if ($null -eq $deviceLines -or $deviceLines.Count -eq 0) {
        Write-Host "No device found. Skip instrumentation because -AllowNoDevice is enabled."
    }
    else {
        Push-Location $targetRoot
        try {
            Write-Host "Running instrumentation tests in:" $targetRoot
            & .\gradlew.bat :app:connectedDebugAndroidTest
            if ($LASTEXITCODE -ne 0) {
                throw "Instrumentation tests failed with exit code $LASTEXITCODE"
            }
        }
        finally {
            Pop-Location
        }
    }
}

if ($GenerateSignoffReport) {
    $signoffArgs = @(
        "-ExecutionPolicy", "Bypass",
        "-File", (Join-Path $scriptDir "Generate-ReleaseSignoffReport.ps1"),
        "-DecisionPath", $DecisionOutputPath,
        "-AndroidTestResultPath", $AndroidTestResultPath,
        "-ManualParityPath", $ManualParityPath,
        "-OutputJsonPath", $SignoffOutputJsonPath,
        "-OutputMarkdownPath", $SignoffOutputMarkdownPath,
        "-P0Count", $P0Count,
        "-P1Count", $P1Count,
        "-P2Count", $P2Count
    )

    & powershell @signoffArgs
    if ($LASTEXITCODE -ne 0) {
        throw "Sign-off report generation failed with exit code $LASTEXITCODE"
    }
}

Write-Host "Stage G gate execution completed successfully."
