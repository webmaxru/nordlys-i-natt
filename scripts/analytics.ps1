<#
.SYNOPSIS
Prints a Nordlys Application Insights analytics summary in the terminal.

.DESCRIPTION
Queries the Nordlys Application Insights customEvents table with the Azure CLI
and prints visitor, forecast, verdict, conversion, subscription, and daily trend
metrics without opening the Azure portal.

The script uses sum(itemCount) for all aggregates. page_view is unsampled and
therefore exact; other events are sampled by Application Insights and itemCount
contains the de-sampled estimate.

.PARAMETER Days
Number of days to include in the main reporting window. Defaults to 30.

.PARAMETER ResourceGroup
Azure resource group containing the Application Insights resource. Defaults to rg-nordlys.

.PARAMETER AppName
Application Insights resource name. Defaults to nordlys-appi-eeyobitljk4fq.

.PARAMETER Help
Shows this help.

.EXAMPLE
.\scripts\analytics.ps1

.EXAMPLE
.\scripts\analytics.ps1 -Days 7

.EXAMPLE
.\scripts\analytics.ps1 -Days 90 -ResourceGroup rg-nordlys -AppName nordlys-appi-eeyobitljk4fq
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 3650)]
    [int]$Days = 30,

    [string]$ResourceGroup = 'rg-nordlys',
    [string]$AppName = 'nordlys-appi-eeyobitljk4fq',

    [switch]$Help
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$SubscriptionId = 'd0b7d6ee-17bf-4c4f-b79d-4f6c2cb583fd'

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-WarningLine {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Failure {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

function Invoke-AzJson {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [switch]$AllowEmpty
    )

    $output = & az @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String).Trim()

    if ($exitCode -ne 0) {
        throw $text
    }

    if ([string]::IsNullOrWhiteSpace($text)) {
        if ($AllowEmpty) { return $null }
        return $null
    }

    return $text | ConvertFrom-Json
}

function Test-AzLogin {
    try {
        [void](Invoke-AzJson -Arguments @('account', 'show', '-o', 'json'))
    }
    catch {
        throw "Azure CLI is not logged in or cannot read the current account. Run 'az login' outside this script, then try again. Details: $($_.Exception.Message)"
    }
}

function Ensure-AppInsightsExtension {
    $output = & az extension show -n application-insights -o none 2>&1
    if ($LASTEXITCODE -eq 0) { return }

    Write-WarningLine 'Azure CLI application-insights extension is missing; installing it...'
    $output = & az extension add -n application-insights --only-show-errors 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Could not install the Azure CLI application-insights extension. Details: $(($output | Out-String).Trim())"
    }
}

function Invoke-AppInsightsQuery {
    param([Parameter(Mandatory = $true)][string]$Query)

    $singleLineQuery = ($Query -replace "(\r?\n)+", ' ' -replace '\s+', ' ').Trim()

    return Invoke-AzJson -Arguments @(
        'monitor', 'app-insights', 'query',
        '--app', $AppName,
        '-g', $ResourceGroup,
        '--subscription', $SubscriptionId,
        '--analytics-query', $singleLineQuery,
        '-o', 'json'
    )
}

function ConvertFrom-AppInsightsResult {
    param($Result)

    if ($null -eq $Result -or $null -eq $Result.tables -or @($Result.tables).Count -eq 0) {
        return @()
    }

    $table = @($Result.tables)[0]
    if ($null -eq $table.rows -or @($table.rows).Count -eq 0) {
        return @()
    }

    $columns = @($table.columns | ForEach-Object { $_.name })
    $objects = New-Object System.Collections.Generic.List[object]

    foreach ($row in @($table.rows)) {
        $values = @($row)
        $properties = [ordered]@{}
        for ($i = 0; $i -lt $columns.Count; $i++) {
            $value = $null
            if ($i -lt $values.Count) {
                $value = $values[$i]
            }
            $properties[$columns[$i]] = $value
        }
        $objects.Add([PSCustomObject]$properties)
    }

    return $objects.ToArray()
}

function Get-Number {
    param(
        $Object,
        [string]$Name
    )

    if ($null -eq $Object) { return 0 }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value) { return 0 }
    return [double]$property.Value
}

function Format-Number {
    param([double]$Value)
    return ([math]::Round($Value)).ToString('N0', [System.Globalization.CultureInfo]::InvariantCulture)
}

function Format-Percent {
    param(
        [double]$Part,
        [double]$Total
    )

    if ($Total -le 0) { return '0.0%' }
    return ('{0:N1}%' -f (100.0 * $Part / $Total))
}

function Get-CurrentSubscriberCount {
    try {
        $subscriptionsScript = Join-Path $PSScriptRoot 'subscriptions.ps1'
        if (-not (Test-Path $subscriptionsScript)) {
            return [PSCustomObject]@{ Count = $null; Message = 'scripts/subscriptions.ps1 was not found.' }
        }

        $output = & pwsh -NoProfile -File $subscriptionsScript -Action Count -ResourceGroup $ResourceGroup 2>&1
        $exitCode = $LASTEXITCODE
        $text = ($output | Out-String).Trim()

        if ($exitCode -ne 0) {
            return [PSCustomObject]@{ Count = $null; Message = $text }
        }

        if ($text -match 'Total subscriptions:\s*(\d+)') {
            return [PSCustomObject]@{ Count = [int]$Matches[1]; Message = $null }
        }

        return [PSCustomObject]@{ Count = $null; Message = $text }
    }
    catch {
        return [PSCustomObject]@{ Count = $null; Message = $_.Exception.Message }
    }
}

function Show-DailyTrend {
    param([object[]]$Rows)

    Write-Info 'Daily visits trend (last 14 days)'

    if ($Rows.Count -eq 0) {
        Write-Host 'No page views found.'
        return
    }

    $maxVisits = 0.0
    foreach ($row in $Rows) {
        $maxVisits = [math]::Max($maxVisits, (Get-Number -Object $row -Name 'visits'))
    }

    foreach ($row in $Rows) {
        $visits = Get-Number -Object $row -Name 'visits'
        $date = ([datetime]$row.day).ToString('yyyy-MM-dd')
        if ($visits -le 0 -or $maxVisits -le 0) {
            $bar = '·'
        }
        else {
            $length = [math]::Max(1, [math]::Ceiling(($visits / $maxVisits) * 24))
            $bar = '█' * $length
        }

        Write-Host ('  {0}  {1,-24} {2}' -f $date, $bar, (Format-Number -Value $visits))
    }
}

if ($Help) {
    Get-Help -Detailed $PSCommandPath
    exit 0
}

try {
    Test-AzLogin
    Ensure-AppInsightsExtension

    $summaryQuery = @"
customEvents
| where timestamp > ago(7d) or timestamp > ago(${Days}d) or timestamp >= startofday(now())
| summarize
    visitsToday = sumif(itemCount, name == 'page_view' and timestamp >= startofday(now())),
    visits7d = sumif(itemCount, name == 'page_view' and timestamp > ago(7d)),
    visitsNd = sumif(itemCount, name == 'page_view' and timestamp > ago(${Days}d)),
    forecasts = sumif(itemCount, name == 'verdict_computed' and timestamp > ago(${Days}d)),
    optIns = sumif(itemCount, name == 'subscription_created' and timestamp > ago(${Days}d)),
    unsubscribes = sumif(itemCount, name == 'subscription_deleted' and timestamp > ago(${Days}d)),
    shares = sumif(itemCount, name == 'share_clicked' and timestamp > ago(${Days}d)),
    installs = sumif(itemCount, name == 'pwa_installed' and timestamp > ago(${Days}d))
"@

    $verdictQuery = @"
customEvents
| where name == 'verdict_computed' and timestamp > ago(${Days}d)
| extend verdict = toupper(tostring(customDimensions['verdict']))
| summarize hits = sum(itemCount) by verdict
| order by verdict asc
"@

    $dailyQuery = @"
let start = startofday(ago(13d));
range day from start to startofday(now()) step 1d
| join kind=leftouter (
    customEvents
    | where name == 'page_view' and timestamp >= start
    | summarize visits = sum(itemCount) by day = bin(timestamp, 1d)
) on day
| project day, visits = coalesce(visits, 0)
| order by day asc
"@

    $summaryRows = ConvertFrom-AppInsightsResult -Result (Invoke-AppInsightsQuery -Query $summaryQuery)
    $summary = $null
    if ($summaryRows.Count -gt 0) { $summary = $summaryRows[0] }

    $verdictRows = ConvertFrom-AppInsightsResult -Result (Invoke-AppInsightsQuery -Query $verdictQuery)
    $dailyRows = ConvertFrom-AppInsightsResult -Result (Invoke-AppInsightsQuery -Query $dailyQuery)
    $subscriberResult = Get-CurrentSubscriberCount

    $verdictCounts = @{
        GO = 0.0
        MAYBE = 0.0
        NO = 0.0
    }
    $otherVerdicts = New-Object System.Collections.Generic.List[object]
    foreach ($row in $verdictRows) {
        $verdict = [string]$row.verdict
        $hits = Get-Number -Object $row -Name 'hits'
        if ($verdictCounts.ContainsKey($verdict)) {
            $verdictCounts[$verdict] = $hits
        }
        elseif (-not [string]::IsNullOrWhiteSpace($verdict)) {
            $otherVerdicts.Add([PSCustomObject]@{ Verdict = $verdict; Hits = $hits })
        }
    }
    $verdictTotal = [double]($verdictCounts.GO + $verdictCounts.MAYBE + $verdictCounts.NO)
    foreach ($row in $otherVerdicts) {
        $verdictTotal += [double]$row.Hits
    }

    Write-Info 'Nordlys i natt? analytics'
    Write-Host ("App: {0}" -f $AppName)
    Write-Host ("Window: last {0} day(s), generated {1}" -f $Days, (Get-Date).ToString('yyyy-MM-dd HH:mm zzz'))
    Write-Host ''

    Write-Info 'Visitors (exact page_view events)'
    Write-Host ('  Today:        {0}' -f (Format-Number -Value (Get-Number -Object $summary -Name 'visitsToday')))
    if ($Days -ge 7) {
        Write-Host ('  Last 7 days:  {0}' -f (Format-Number -Value (Get-Number -Object $summary -Name 'visits7d')))
    }
    if ($Days -ne 7) {
        Write-Host ('  Last {0} days: {1}' -f $Days, (Format-Number -Value (Get-Number -Object $summary -Name 'visitsNd')))
    }
    Write-Host ''

    Write-Info 'Forecast loads'
    Write-Host ('  verdict_computed, last {0} days: {1}' -f $Days, (Format-Number -Value (Get-Number -Object $summary -Name 'forecasts')))
    Write-Host ''

    Write-Info 'Verdict mix (server-side verdict_computed)'
    foreach ($verdict in @('GO', 'MAYBE', 'NO')) {
        $hits = [double]$verdictCounts[$verdict]
        Write-Host ('  {0,-5} {1,8}  {2}' -f $verdict, (Format-Number -Value $hits), (Format-Percent -Part $hits -Total $verdictTotal))
    }
    foreach ($row in $otherVerdicts) {
        Write-Host ('  {0,-5} {1,8}  {2}' -f $row.Verdict, (Format-Number -Value $row.Hits), (Format-Percent -Part $row.Hits -Total $verdictTotal))
    }
    Write-Host ''

    Write-Info 'Conversions (last window)'
    Write-Host ('  Opt-ins:       {0}  subscription_created' -f (Format-Number -Value (Get-Number -Object $summary -Name 'optIns')))
    Write-Host ('  Unsubscribes:  {0}  subscription_deleted' -f (Format-Number -Value (Get-Number -Object $summary -Name 'unsubscribes')))
    Write-Host ('  Shares:        {0}  share_clicked (client-side, consent-gated; undercounts)' -f (Format-Number -Value (Get-Number -Object $summary -Name 'shares')))
    Write-Host ('  Installs:      {0}  pwa_installed (client-side, consent-gated; undercounts)' -f (Format-Number -Value (Get-Number -Object $summary -Name 'installs')))
    Write-Host ''

    Write-Info 'Current push subscribers'
    if ($null -ne $subscriberResult.Count) {
        Write-Success ('  Total subscriptions: {0}' -f $subscriberResult.Count)
    }
    else {
        Write-WarningLine ('  Could not read subscription count: {0}' -f $subscriberResult.Message)
        Write-Host '  Try: pwsh scripts\subscriptions.ps1 -Action Count'
    }
    Write-Host ''

    Show-DailyTrend -Rows $dailyRows
    Write-Host ''
    Write-WarningLine 'Note: shares and installs are client-side consent-gated events, so they undercount real usage.'
}
catch {
    Write-Failure $_.Exception.Message
    exit 1
}
