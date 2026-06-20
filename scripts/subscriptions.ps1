<#
.SYNOPSIS
Lists and manages Nordlys push-notification subscriptions in Azure Table Storage.

.DESCRIPTION
This script uses the Azure CLI to read and update rows in the subscriptions
Azure Table. It resolves the storage account connection string once, then uses
az storage entity commands with that connection string for reliable data-plane
access.

Subscriptions are stored with PartitionKey "subscription" and RowKey equal to
the subscription id.

.PARAMETER Action
Action to perform: List, Show, Remove, Edit, or Count.

.PARAMETER Id
Subscription id, stored as the row's RowKey. Required for Show, Remove, and Edit.

.PARAMETER Name
New display name for Edit.

.PARAMETER Lang
New language for Edit. Valid values are nb and en.

.PARAMETER Lat
New latitude for Edit.

.PARAMETER Lon
New longitude for Edit.

.PARAMETER ShowKeys
Shows raw p256dh and auth keys for Show. By default, these sensitive values are redacted.

.PARAMETER Force
Skips the confirmation prompt for Remove.

.PARAMETER Account
Azure Storage account name. Defaults to nordlyssteeyobitljk4fq.

.PARAMETER ResourceGroup
Azure resource group name. Defaults to rg-nordlys.

.PARAMETER Table
Azure Table name. Defaults to subscriptions.

.PARAMETER Partition
PartitionKey value. Defaults to subscription.

.PARAMETER Help
Shows this help.

.EXAMPLE
.\scripts\subscriptions.ps1 -Action List

.EXAMPLE
.\scripts\subscriptions.ps1 -Action Show -Id "abc123"

.EXAMPLE
.\scripts\subscriptions.ps1 -Action Show -Id "abc123" -ShowKeys

.EXAMPLE
.\scripts\subscriptions.ps1 -Action Edit -Id "abc123" -Name "Cabin" -Lang nb -Lat 59.9139 -Lon 10.7522

.EXAMPLE
.\scripts\subscriptions.ps1 -Action Remove -Id "abc123"

.EXAMPLE
.\scripts\subscriptions.ps1 -Action Count
#>
[CmdletBinding()]
param(
    [ValidateSet('List', 'Show', 'Remove', 'Edit', 'Count')]
    [string]$Action = 'List',

    [string]$Id,
    [string]$Name,
    [ValidateSet('nb', 'en')]
    [string]$Lang,
    [Nullable[double]]$Lat,
    [Nullable[double]]$Lon,

    [switch]$ShowKeys,
    [switch]$Force,
    [switch]$Help,

    [string]$Account = 'nordlyssteeyobitljk4fq',
    [string]$ResourceGroup = 'rg-nordlys',
    [string]$Table = 'subscriptions',
    [string]$Partition = 'subscription'
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
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

function Get-ConnectionString {
    param(
        [string]$StorageAccount,
        [string]$StorageResourceGroup
    )

    try {
        $connectionString = & az storage account show-connection-string `
            -n $StorageAccount `
            -g $StorageResourceGroup `
            --query connectionString `
            -o tsv 2>&1

        if ($LASTEXITCODE -ne 0) {
            throw (($connectionString | Out-String).Trim())
        }

        $connectionString = (($connectionString | Out-String).Trim())
        if ([string]::IsNullOrWhiteSpace($connectionString)) {
            throw 'Azure CLI returned an empty connection string.'
        }

        return $connectionString
    }
    catch {
        throw "Could not resolve the storage connection string for account '$StorageAccount' in resource group '$StorageResourceGroup'. Run 'az login' and confirm you have access. Details: $($_.Exception.Message)"
    }
}

function Get-EntityArgs {
    param(
        [string]$ConnectionString,
        [string]$TableName
    )

    return @(
        '--connection-string', $ConnectionString,
        '--table-name', $TableName
    )
}

function Get-Subscriptions {
    param(
        [string]$ConnectionString,
        [string]$TableName,
        [string]$PartitionKey
    )

    $args = @(
        'storage', 'entity', 'query'
    ) + (Get-EntityArgs -ConnectionString $ConnectionString -TableName $TableName) + @(
        '--filter', "PartitionKey eq '$PartitionKey'",
        '-o', 'json'
    )

    $result = Invoke-AzJson -Arguments $args
    if ($null -eq $result) { return @() }
    if ($result.PSObject.Properties.Name -contains 'items') {
        if ($null -eq $result.items) { return @() }
        return @($result.items)
    }
    return @($result)
}

function Get-Subscription {
    param(
        [string]$ConnectionString,
        [string]$TableName,
        [string]$PartitionKey,
        [string]$RowKey
    )

    $args = @(
        'storage', 'entity', 'show'
    ) + (Get-EntityArgs -ConnectionString $ConnectionString -TableName $TableName) + @(
        '--partition-key', $PartitionKey,
        '--row-key', $RowKey,
        '-o', 'json'
    )

    try {
        return Invoke-AzJson -Arguments $args
    }
    catch {
        $message = $_.Exception.Message
        if ($message -match 'Not Found|ResourceNotFound|404|does not exist') {
            throw "Subscription '$RowKey' was not found in table '$TableName'."
        }
        throw
    }
}

function Format-SubscriptionRow {
    param($Entity)

    [PSCustomObject]@{
        id             = Get-EntityValue -Entity $Entity -Name 'RowKey'
        name           = Get-EntityValue -Entity $Entity -Name 'name'
        lat            = Get-EntityValue -Entity $Entity -Name 'lat'
        lon            = Get-EntityValue -Entity $Entity -Name 'lon'
        lang           = Get-EntityValue -Entity $Entity -Name 'lang'
        createdAt      = Get-EntityValue -Entity $Entity -Name 'createdAt'
        lastNotifiedAt = Get-EntityValue -Entity $Entity -Name 'lastNotifiedAt'
        lastVerdict    = Get-EntityValue -Entity $Entity -Name 'lastVerdict'
    }
}

function Get-EntityValue {
    param(
        $Entity,
        [string]$Name
    )

    $property = $Entity.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function Show-List {
    param([object[]]$Entities)

    Write-Info "Push notification subscriptions"
    Write-Host ''

    $rows = @($Entities | Sort-Object createdAt | ForEach-Object { Format-SubscriptionRow -Entity $_ })
    if ($rows.Count -eq 0) {
        Write-Host 'No subscriptions found.'
    }
    else {
        $rows | Format-Table -AutoSize | Out-Host
    }

    Write-Host ("Total: {0}" -f $rows.Count)
}

function Show-Details {
    param(
        $Entity,
        [bool]$RevealKeys
    )

    Write-Info "Subscription $($Entity.RowKey)"
    Write-Host ''

    $properties = [ordered]@{}
    foreach ($property in ($Entity.PSObject.Properties | Sort-Object Name)) {
        $value = $property.Value
        if (-not $RevealKeys -and ($property.Name -eq 'p256dh' -or $property.Name -eq 'auth')) {
            if ([string]::IsNullOrEmpty([string]$value)) {
                $value = ''
            }
            else {
                $value = '[redacted; use -ShowKeys to reveal]'
            }
        }
        $properties[$property.Name] = $value
    }

    [PSCustomObject]$properties | Format-List | Out-Host
}

function Remove-Subscription {
    param(
        [string]$ConnectionString,
        [string]$TableName,
        [string]$PartitionKey,
        [string]$RowKey,
        [bool]$SkipPrompt
    )

    [void](Get-Subscription -ConnectionString $ConnectionString -TableName $TableName -PartitionKey $PartitionKey -RowKey $RowKey)

    if (-not $SkipPrompt) {
        $answer = Read-Host "Delete subscription '$RowKey'? Type YES to confirm"
        if ($answer -ne 'YES') {
            Write-Host 'Remove cancelled.'
            return
        }
    }

    $args = @(
        'storage', 'entity', 'delete'
    ) + (Get-EntityArgs -ConnectionString $ConnectionString -TableName $TableName) + @(
        '--partition-key', $PartitionKey,
        '--row-key', $RowKey,
        '-o', 'none'
    )

    [void](Invoke-AzJson -Arguments $args -AllowEmpty)
    Write-Host "Removed subscription '$RowKey'."
}

function Convert-ToInvariantDouble {
    param([double]$Value)
    return $Value.ToString('R', [System.Globalization.CultureInfo]::InvariantCulture)
}

function Edit-Subscription {
    param(
        [string]$ConnectionString,
        [string]$TableName,
        [string]$PartitionKey,
        [string]$RowKey,
        [hashtable]$ProvidedParameters
    )

    [void](Get-Subscription -ConnectionString $ConnectionString -TableName $TableName -PartitionKey $PartitionKey -RowKey $RowKey)

    $updates = New-Object System.Collections.Generic.List[string]
    if ($ProvidedParameters.ContainsKey('Name')) {
        $updates.Add("name=$Name")
    }
    if ($ProvidedParameters.ContainsKey('Lang')) {
        $updates.Add("lang=$Lang")
    }
    if ($ProvidedParameters.ContainsKey('Lat')) {
        $updates.Add(("lat={0}" -f (Convert-ToInvariantDouble -Value $Lat)))
    }
    if ($ProvidedParameters.ContainsKey('Lon')) {
        $updates.Add(("lon={0}" -f (Convert-ToInvariantDouble -Value $Lon)))
    }

    if ($updates.Count -eq 0) {
        throw 'Nothing to edit. Provide one or more of -Name, -Lang, -Lat, or -Lon.'
    }

    $entity = @("PartitionKey=$PartitionKey", "RowKey=$RowKey") + $updates.ToArray()
    $args = @(
        'storage', 'entity', 'merge'
    ) + (Get-EntityArgs -ConnectionString $ConnectionString -TableName $TableName) + @(
        '--entity'
    ) + $entity + @(
        '-o', 'none'
    )

    [void](Invoke-AzJson -Arguments $args -AllowEmpty)
    Write-Host "Updated subscription '$RowKey'."
}

if ($Help) {
    Get-Help -Detailed $PSCommandPath
    exit 0
}

try {
    if (($Action -eq 'Show' -or $Action -eq 'Remove' -or $Action -eq 'Edit') -and [string]::IsNullOrWhiteSpace($Id)) {
        throw "-Id is required for Action '$Action'."
    }

    $connectionString = Get-ConnectionString -StorageAccount $Account -StorageResourceGroup $ResourceGroup

    switch ($Action) {
        'List' {
            $subscriptions = Get-Subscriptions -ConnectionString $connectionString -TableName $Table -PartitionKey $Partition
            Show-List -Entities $subscriptions
        }
        'Show' {
            $subscription = Get-Subscription -ConnectionString $connectionString -TableName $Table -PartitionKey $Partition -RowKey $Id
            Show-Details -Entity $subscription -RevealKeys:$ShowKeys.IsPresent
        }
        'Remove' {
            Remove-Subscription -ConnectionString $connectionString -TableName $Table -PartitionKey $Partition -RowKey $Id -SkipPrompt:$Force.IsPresent
        }
        'Edit' {
            Edit-Subscription -ConnectionString $connectionString -TableName $Table -PartitionKey $Partition -RowKey $Id -ProvidedParameters $PSBoundParameters
        }
        'Count' {
            $subscriptions = Get-Subscriptions -ConnectionString $connectionString -TableName $Table -PartitionKey $Partition
            Write-Host ("Total subscriptions: {0}" -f @($subscriptions).Count)
        }
    }
}
catch {
    Write-Failure $_.Exception.Message
    exit 1
}
