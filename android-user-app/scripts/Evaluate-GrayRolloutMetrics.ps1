param(
    [Parameter(ParameterSetName = "file", Mandatory = $true)]
    [string]$MetricsPath,
    [Parameter(ParameterSetName = "url", Mandatory = $true)]
    [string]$MetricsUrl,
    [string]$ThresholdPath = "docs/gray/rollout_thresholds.json",
    [string]$AuthBearerToken = $env:GRAY_METRICS_BEARER_TOKEN,
    [string]$OutputDecisionPath
)

$ErrorActionPreference = "Stop"

function Load-JsonFile([string]$path) {
    if (-not (Test-Path $path)) {
        throw "File not found: $path"
    }
    return Get-Content $path -Raw | ConvertFrom-Json
}

function Normalize-JsonObject([object]$obj) {
    return ($obj | ConvertTo-Json -Depth 50) | ConvertFrom-Json
}

function Load-Metrics() {
    if ($PSCmdlet.ParameterSetName -eq "file") {
        return Normalize-JsonObject (Load-JsonFile $MetricsPath)
    }

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($AuthBearerToken)) {
        $headers["Authorization"] = "Bearer $AuthBearerToken"
    }

    $response = Invoke-RestMethod -Uri $MetricsUrl -Method Get -Headers $headers -TimeoutSec 30
    if ($null -eq $response) {
        throw "Metrics request returned empty payload: $MetricsUrl"
    }

    if ($response.PSObject.Properties.Name -contains "metrics") {
        return Normalize-JsonObject $response.metrics
    }

    return Normalize-JsonObject $response
}

function Get-NumericValue([object]$obj, [string]$name) {
    $value = $obj.$name
    if ($null -eq $value) {
        throw "Missing metric field: $name"
    }
    return [double]$value
}

$thresholds = Load-JsonFile $ThresholdPath
$metrics = Load-Metrics

$violations = @()
$checks = @()

foreach ($p in $thresholds.max.PSObject.Properties) {
    $name = $p.Name
    $limit = [double]$p.Value
    $actual = Get-NumericValue $metrics $name
    $ok = $actual -le $limit
    $checks += [pscustomobject]@{
        Metric = $name
        Rule = "actual <= $limit"
        Actual = $actual
        Result = if ($ok) { "PASS" } else { "FAIL" }
    }
    if (-not $ok) {
        $violations += "$name actual=$actual exceeds max=$limit"
    }
}

foreach ($p in $thresholds.min.PSObject.Properties) {
    $name = $p.Name
    $limit = [double]$p.Value
    $actual = Get-NumericValue $metrics $name
    $ok = $actual -ge $limit
    $checks += [pscustomobject]@{
        Metric = $name
        Rule = "actual >= $limit"
        Actual = $actual
        Result = if ($ok) { "PASS" } else { "FAIL" }
    }
    if (-not $ok) {
        $violations += "$name actual=$actual below min=$limit"
    }
}

Write-Host "Gray rollout evaluation window (minutes):" $thresholds.window_minutes
if ($metrics.timestamp) {
    Write-Host "Metric snapshot timestamp:" $metrics.timestamp
}

$checks | Format-Table -AutoSize

$decision = if ($violations.Count -gt 0) { "STOP_ROLLOUT_AND_ROLLBACK" } else { "CONTINUE_ROLLOUT" }
$source = if ($PSCmdlet.ParameterSetName -eq "file") { "file:$MetricsPath" } else { "url:$MetricsUrl" }

$decisionReport = [pscustomobject]@{
    evaluated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    source = $source
    threshold_path = $ThresholdPath
    decision = $decision
    violations = $violations
    checks = $checks
}

if (-not [string]::IsNullOrWhiteSpace($OutputDecisionPath)) {
    $outputDir = Split-Path -Parent $OutputDecisionPath
    if (-not [string]::IsNullOrWhiteSpace($outputDir) -and -not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir | Out-Null
    }
    $decisionReport | ConvertTo-Json -Depth 20 | Set-Content -Path $OutputDecisionPath -Encoding UTF8
    Write-Host "Decision report written:" $OutputDecisionPath
}

if ($violations.Count -gt 0) {
    Write-Host ""
    Write-Host "Decision: STOP_ROLLOUT_AND_ROLLBACK" -ForegroundColor Red
    $violations | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
    exit 2
}

Write-Host ""
Write-Host "Decision: CONTINUE_ROLLOUT" -ForegroundColor Green
exit 0
