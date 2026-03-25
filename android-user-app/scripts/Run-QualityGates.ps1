param(
    [switch]$SkipUnitTests
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
        Write-Host "Creating temporary junction for ASCII-safe test execution:" $junctionRoot
        New-Item -ItemType Junction -Path $junctionRoot -Target $rootPath | Out-Null
    }
    return $junctionRoot
}

$targetRoot = Use-AsciiWorkspace $projectRoot

$androidStudioJbr = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path (Join-Path $androidStudioJbr "bin\java.exe")) {
    # Force known-compatible JDK for AGP on this workspace.
    $env:JAVA_HOME = $androidStudioJbr
}

$gradleTasks = @()
if (-not $SkipUnitTests) {
    $gradleTasks += ":app:testDebugUnitTest"
}
$gradleTasks += ":app:assembleDebug"

Push-Location $targetRoot
try {
    Write-Host "Running quality gates in:" $targetRoot
    Write-Host "Tasks:" ($gradleTasks -join " ")
    & .\gradlew.bat @gradleTasks
    if ($LASTEXITCODE -ne 0) {
        throw "Quality gate failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

Write-Host "Quality gates passed."
