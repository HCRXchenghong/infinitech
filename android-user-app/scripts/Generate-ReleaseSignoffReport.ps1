param(
    [string]$DecisionPath = "docs/gray/last_decision.json",
    [string]$AndroidTestResultPath = "app/build/outputs/androidTest-results/connected/debug/TEST-*-_app-.xml",
    [string]$ManualParityPath = "docs/signoff/manual_parity_status.json",
    [string]$OutputJsonPath = "docs/signoff/release_signoff_report.json",
    [string]$OutputMarkdownPath = "docs/signoff/release_signoff_report.md",
    [int]$P0Count = -1,
    [int]$P1Count = -1,
    [int]$P2Count = -1,
    [switch]$FailIfNotReady
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path

function Resolve-ProjectPath([string]$path) {
    if ([string]::IsNullOrWhiteSpace($path)) {
        return $path
    }
    if ([System.IO.Path]::IsPathRooted($path)) {
        return $path
    }
    return Join-Path $projectRoot $path
}

function Read-JsonFile([string]$path) {
    if (-not (Test-Path $path)) {
        return $null
    }
    return Get-Content -Path $path -Raw | ConvertFrom-Json
}

function Normalize-DefectCount([int]$value) {
    if ($value -lt 0) {
        return $null
    }
    return $value
}

function Parse-AndroidTestResult([string]$pathPattern) {
    $resolvedPattern = Resolve-ProjectPath $pathPattern
    $files = Get-ChildItem -Path $resolvedPattern -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending

    if ($null -eq $files -or $files.Count -eq 0) {
        return [pscustomobject]@{
            found = $false
            path = $resolvedPattern
            tests = $null
            failures = $null
            errors = $null
            skipped = $null
            passed = $null
            timestamp = $null
            suite_name = $null
            cases = @()
        }
    }

    $latest = $files[0]
    [xml]$xml = Get-Content -Path $latest.FullName -Raw
    $suite = $xml.testsuite
    if ($null -eq $suite) {
        throw "Unexpected Android test report format: $($latest.FullName)"
    }

    $tests = [int]$suite.tests
    $failures = [int]$suite.failures
    $errors = [int]$suite.errors
    $skipped = [int]$suite.skipped
    $passed = $tests - $failures - $errors - $skipped

    $caseNames = @()
    foreach ($case in $suite.testcase) {
        $caseNames += "$($case.classname).$($case.name)"
    }

    return [pscustomobject]@{
        found = $true
        path = (Resolve-Path $latest.FullName).Path
        tests = $tests
        failures = $failures
        errors = $errors
        skipped = $skipped
        passed = $passed
        timestamp = [string]$suite.timestamp
        suite_name = [string]$suite.name
        cases = $caseNames
    }
}

function Parse-ManualParityStatus([string]$path) {
    $resolvedPath = Resolve-ProjectPath $path
    $raw = Read-JsonFile $resolvedPath

    if ($null -eq $raw) {
        return [pscustomobject]@{
            found = $false
            path = $resolvedPath
            completed = $false
            all_passed = $false
            owner = $null
            updated_at = $null
            items = @()
        }
    }

    $items = @()
    if ($raw.PSObject.Properties.Name -contains "items" -and $null -ne $raw.items) {
        foreach ($item in $raw.items) {
            $items += [pscustomobject]@{
                name = [string]$item.name
                passed = [bool]$item.passed
                note = [string]$item.note
            }
        }
    }

    $allPassed = $true
    if ($items.Count -gt 0) {
        $allPassed = -not ($items | Where-Object { -not $_.passed })
    } elseif ($raw.PSObject.Properties.Name -contains "all_passed") {
        $allPassed = [bool]$raw.all_passed
    } else {
        $allPassed = [bool]$raw.completed
    }

    return [pscustomobject]@{
        found = $true
        path = $resolvedPath
        completed = [bool]$raw.completed
        all_passed = [bool]$allPassed
        owner = [string]$raw.owner
        updated_at = [string]$raw.updated_at
        items = $items
    }
}

$resolvedDecisionPath = Resolve-ProjectPath $DecisionPath
$resolvedOutputJsonPath = Resolve-ProjectPath $OutputJsonPath
$resolvedOutputMarkdownPath = Resolve-ProjectPath $OutputMarkdownPath

$decision = Read-JsonFile $resolvedDecisionPath
$androidTest = Parse-AndroidTestResult $AndroidTestResultPath
$manualParity = Parse-ManualParityStatus $ManualParityPath

$p0 = Normalize-DefectCount $P0Count
$p1 = Normalize-DefectCount $P1Count
$p2 = Normalize-DefectCount $P2Count

$grayDecision = $null
$grayDecisionSource = $null
$grayReady = $false
if ($null -ne $decision) {
    $grayDecision = [string]$decision.decision
    $grayDecisionSource = [string]$decision.source
    $grayReady = $grayDecision -eq "CONTINUE_ROLLOUT"
}

$instrumentationReady = $androidTest.found -and $androidTest.failures -eq 0 -and $androidTest.errors -eq 0
$manualParityReady = $manualParity.found -and $manualParity.completed -and $manualParity.all_passed
$defectCountsProvided = ($null -ne $p0) -and ($null -ne $p1) -and ($null -ne $p2)
$defectReady = $defectCountsProvided -and $p0 -eq 0 -and $p1 -eq 0 -and $p2 -eq 0

$blockers = @()
if (-not $grayReady) {
    if ($null -eq $grayDecision) {
        $blockers += "gray_decision_missing"
    } else {
        $blockers += "gray_decision_not_continue_rollout"
    }
}
if (-not $instrumentationReady) {
    if (-not $androidTest.found) {
        $blockers += "instrumentation_report_missing"
    } else {
        $blockers += "instrumentation_failures_present"
    }
}
if (-not $manualParityReady) {
    if (-not $manualParity.found) {
        $blockers += "manual_parity_status_missing"
    } else {
        $blockers += "manual_parity_not_completed"
    }
}
if (-not $defectReady) {
    if (-not $defectCountsProvided) {
        $blockers += "p0_p1_p2_counts_missing"
    } else {
        $blockers += "p0_p1_p2_not_zero"
    }
}

$releaseReadiness = if ($blockers.Count -eq 0) { "READY_FOR_RELEASE" } else { "BLOCKED" }

$report = [pscustomobject]@{
    generated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    release_readiness = $releaseReadiness
    blockers = $blockers
    inputs = [pscustomobject]@{
        decision_path = $resolvedDecisionPath
        android_test_result_path_pattern = (Resolve-ProjectPath $AndroidTestResultPath)
        manual_parity_path = (Resolve-ProjectPath $ManualParityPath)
    }
    gray_rollout = [pscustomobject]@{
        available = ($null -ne $decision)
        source = $grayDecisionSource
        decision = $grayDecision
        pass = $grayReady
    }
    instrumentation = [pscustomobject]@{
        found = $androidTest.found
        report_path = $androidTest.path
        suite_name = $androidTest.suite_name
        timestamp = $androidTest.timestamp
        tests = $androidTest.tests
        failures = $androidTest.failures
        errors = $androidTest.errors
        skipped = $androidTest.skipped
        passed = $androidTest.passed
        pass = $instrumentationReady
    }
    manual_parity = [pscustomobject]@{
        found = $manualParity.found
        path = $manualParity.path
        completed = $manualParity.completed
        all_passed = $manualParity.all_passed
        owner = $manualParity.owner
        updated_at = $manualParity.updated_at
        pass = $manualParityReady
        items = $manualParity.items
    }
    defect_counts = [pscustomobject]@{
        p0 = $p0
        p1 = $p1
        p2 = $p2
        provided = $defectCountsProvided
        pass = $defectReady
    }
}

$jsonDir = Split-Path -Parent $resolvedOutputJsonPath
if (-not [string]::IsNullOrWhiteSpace($jsonDir) -and -not (Test-Path $jsonDir)) {
    New-Item -ItemType Directory -Path $jsonDir | Out-Null
}

$mdDir = Split-Path -Parent $resolvedOutputMarkdownPath
if (-not [string]::IsNullOrWhiteSpace($mdDir) -and -not (Test-Path $mdDir)) {
    New-Item -ItemType Directory -Path $mdDir | Out-Null
}

$report | ConvertTo-Json -Depth 20 | Set-Content -Path $resolvedOutputJsonPath -Encoding UTF8

$blockersText = if ($blockers.Count -eq 0) { "none" } else { $blockers -join ", " }
$md = @(
    "# Android Native Release Sign-Off Report",
    "",
    "Generated (UTC): $($report.generated_at_utc)",
    "",
    "## Overall",
    "- Release readiness: **$releaseReadiness**",
    "- Blockers: $blockersText",
    "",
    "## Gray Rollout",
    "- Decision available: $($report.gray_rollout.available)",
    "- Source: $($report.gray_rollout.source)",
    "- Decision: $($report.gray_rollout.decision)",
    "- Pass: $($report.gray_rollout.pass)",
    "",
    "## Instrumentation",
    "- Report path: $($report.instrumentation.report_path)",
    "- Suite: $($report.instrumentation.suite_name)",
    "- Timestamp: $($report.instrumentation.timestamp)",
    "- Tests: $($report.instrumentation.tests)",
    "- Failures: $($report.instrumentation.failures)",
    "- Errors: $($report.instrumentation.errors)",
    "- Skipped: $($report.instrumentation.skipped)",
    "- Pass: $($report.instrumentation.pass)",
    "",
    "## Manual Parity",
    "- Status file found: $($report.manual_parity.found)",
    "- Status path: $($report.manual_parity.path)",
    "- Completed: $($report.manual_parity.completed)",
    "- All passed: $($report.manual_parity.all_passed)",
    "- Owner: $($report.manual_parity.owner)",
    "- Updated at: $($report.manual_parity.updated_at)",
    "- Pass: $($report.manual_parity.pass)",
    "",
    "## Defect Counts",
    "- P0: $($report.defect_counts.p0)",
    "- P1: $($report.defect_counts.p1)",
    "- P2: $($report.defect_counts.p2)",
    "- Provided: $($report.defect_counts.provided)",
    "- Pass: $($report.defect_counts.pass)"
)

if ($manualParity.items.Count -gt 0) {
    $md += ""
    $md += "## Manual Parity Items"
    foreach ($item in $manualParity.items) {
        $md += "- $($item.name): passed=$($item.passed), note=$($item.note)"
    }
}

$md | Set-Content -Path $resolvedOutputMarkdownPath -Encoding UTF8

Write-Host "Release sign-off report JSON:" $resolvedOutputJsonPath
Write-Host "Release sign-off report Markdown:" $resolvedOutputMarkdownPath
Write-Host "Release readiness:" $releaseReadiness
if ($blockers.Count -gt 0) {
    Write-Host "Blockers:" ($blockers -join ", ")
}

if ($FailIfNotReady -and $releaseReadiness -ne "READY_FOR_RELEASE") {
    exit 3
}

exit 0
