<#
.SYNOPSIS
Migrates the deployed Nordlys container image from Azure Container Registry to private GHCR.

.DESCRIPTION
Builds and pushes ghcr.io/webmaxru/nordlys-i-natt image tags, configures the Azure Container App
and Container Apps Job to pull from private GHCR using a classic GitHub PAT, verifies production
health, and optionally deletes the old ACR only after the GHCR cutover is healthy.

The PAT must be a classic token for the GitHub account in -GitHubUser with read:packages and
write:packages. Keep the image private; do not make the GitHub package public.

.EXAMPLE
./scripts/migrate-to-ghcr.ps1 -GitHubPat <classic-pat>

.EXAMPLE
./scripts/migrate-to-ghcr.ps1 -GitHubPat <classic-pat> -DeleteAcr

.EXAMPLE
./scripts/migrate-to-ghcr.ps1 -GitHubPat <classic-pat> -Tag abc1234 -Force -DeleteAcr

.ROLLBACK
If production health fails, re-point the app and job to the ACR image used before migration, e.g.
configure the ACR registry credentials again and run:
  az containerapp update -n nordlys-app-eeyobitljk4fq -g rg-nordlys --image nordlysacreeyobitljk4fq.azurecr.io/nordlys/app:<previous-tag>
  az containerapp job update -n nordlys-job-eeyobitljk4fq -g rg-nordlys --image nordlysacreeyobitljk4fq.azurecr.io/nordlys/app:<previous-tag>
Do not delete the ACR until GHCR health is confirmed green.
#>
[CmdletBinding()]
param(
    [string]$GitHubUser = 'webmaxru',

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$GitHubPat,

    [string]$Image = 'ghcr.io/webmaxru/nordlys-i-natt',
    [string]$Tag = $(git rev-parse --short HEAD),
    [string]$ResourceGroup = 'rg-nordlys',
    [string]$App = 'nordlys-app-eeyobitljk4fq',
    [string]$Job = 'nordlys-job-eeyobitljk4fq',
    [string]$Acr = 'nordlysacreeyobitljk4fq',
    [switch]$DeleteAcr,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$HealthUrl = 'https://nordlys.isainative.dev/api/health'
$SpaUrl = 'https://nordlys.isainative.dev/'
$FullImage = "${Image}:${Tag}"
$LatestImage = "${Image}:latest"

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [string[]]$SensitiveValues = @()
    )

    $displayArguments = $Arguments -join ' '
    foreach ($sensitiveValue in $SensitiveValues) {
        if (-not [string]::IsNullOrEmpty($sensitiveValue)) {
            $displayArguments = $displayArguments.Replace($sensitiveValue, '***')
        }
    }

    Write-Host "> $FilePath $displayArguments" -ForegroundColor DarkGray
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $displayArguments"
    }
}

function Test-Http200 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 20 -UseBasicParsing
        return $response.StatusCode -eq 200
    }
    catch {
        Write-Host "Health probe failed for ${Url}: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

function Wait-ForHttp200 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,

        [int]$Attempts = 30,
        [int]$DelaySeconds = 10
    )

    for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
        Write-Host "Checking $Url ($attempt/$Attempts)..."
        if (Test-Http200 -Url $Url) {
            Write-Host "OK: $Url returned HTTP 200." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds $DelaySeconds
    }

    throw "${Url} did not return HTTP 200. Roll back to the previous ACR image and inspect the latest Container App revision logs."
}

if ([string]::IsNullOrWhiteSpace($Tag)) {
    throw 'Image tag is empty. Pass -Tag explicitly or run this script from a git checkout.'
}

Write-Host "Migrating private image pulls to GHCR." -ForegroundColor Cyan
Write-Host "Image tags: $FullImage and $LatestImage"
Write-Host "Target app/job: $App / $Job in resource group $ResourceGroup"

Write-Host 'Logging in to ghcr.io with the supplied GitHub PAT...'
$GitHubPat | docker login ghcr.io -u $GitHubUser --password-stdin
if ($LASTEXITCODE -ne 0) {
    throw 'docker login ghcr.io failed. Verify the PAT has read:packages and write:packages.'
}

Write-Host 'Building local Docker image...'
Invoke-CheckedCommand -FilePath 'docker' -Arguments @('build', '-t', $FullImage, '-t', $LatestImage, '.')

Write-Host "Pushing $FullImage..."
Invoke-CheckedCommand -FilePath 'docker' -Arguments @('push', $FullImage)

Write-Host "Pushing $LatestImage..."
Invoke-CheckedCommand -FilePath 'docker' -Arguments @('push', $LatestImage)

Write-Host 'Configuring Container App registry credentials for private GHCR...'
Invoke-CheckedCommand -FilePath 'az' -Arguments @(
    'containerapp', 'registry', 'set',
    '--name', $App,
    '--resource-group', $ResourceGroup,
    '--server', 'ghcr.io',
    '--username', $GitHubUser,
    '--password', $GitHubPat,
    '--output', 'none'
) -SensitiveValues @($GitHubPat)

Write-Host "Updating Container App image to $FullImage..."
Invoke-CheckedCommand -FilePath 'az' -Arguments @(
    'containerapp', 'update',
    '--name', $App,
    '--resource-group', $ResourceGroup,
    '--image', $FullImage,
    '--output', 'none'
)

Write-Host 'Configuring Container Apps Job registry credentials for private GHCR...'
Invoke-CheckedCommand -FilePath 'az' -Arguments @(
    'containerapp', 'job', 'registry', 'set',
    '--name', $Job,
    '--resource-group', $ResourceGroup,
    '--server', 'ghcr.io',
    '--username', $GitHubUser,
    '--password', $GitHubPat,
    '--output', 'none'
) -SensitiveValues @($GitHubPat)

Write-Host "Updating Container Apps Job image to $FullImage..."
Invoke-CheckedCommand -FilePath 'az' -Arguments @(
    'containerapp', 'job', 'update',
    '--name', $Job,
    '--resource-group', $ResourceGroup,
    '--image', $FullImage,
    '--output', 'none'
)

Write-Host 'Verifying production health after GHCR cutover...' -ForegroundColor Cyan
Wait-ForHttp200 -Url $HealthUrl
Wait-ForHttp200 -Url $SpaUrl

if ($DeleteAcr) {
    if (-not $Force) {
        Write-Host "ACR deletion requested for $Acr. This is irreversible." -ForegroundColor Yellow
        $confirmation = Read-Host "Type DELETE to delete ACR '$Acr' from resource group '$ResourceGroup'"
        if ($confirmation -ne 'DELETE') {
            Write-Host 'ACR deletion skipped.' -ForegroundColor Yellow
            Write-Host 'GHCR migration completed; old ACR was left in place.' -ForegroundColor Green
            exit 0
        }
    }

    Write-Host "Deleting ACR $Acr after successful health checks..." -ForegroundColor Cyan
    Invoke-CheckedCommand -FilePath 'az' -Arguments @(
        'acr', 'delete',
        '--name', $Acr,
        '--resource-group', $ResourceGroup,
        '--yes',
        '--output', 'none'
    )
}
else {
    Write-Host 'ACR deletion not requested. Re-run with -DeleteAcr after confirming GHCR is stable.' -ForegroundColor Yellow
}

Write-Host 'Private GHCR migration completed successfully.' -ForegroundColor Green
