# Prince George Transport - automated eBay radio publish
# Calls the secured cron endpoint on the live site.

param(
  [string]$SiteUrl = "https://prince-george-transport.pages.dev",
  [string]$EnvFile = "$PSScriptRoot\.ebay-cron.env"
)

$ErrorActionPreference = "Stop"

$logDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("ebay-publish-{0:yyyy-MM-dd_HH-mm-ss}.log" -f (Get-Date))

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $logFile -Value $line
  Write-Host $line
}

if (-not (Test-Path $EnvFile)) {
  Write-Log "Missing $EnvFile. Run scripts\setup-ebay-cron.ps1 first."
  exit 1
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    Set-Variable -Name $matches[1].Trim() -Value $matches[2].Trim() -Scope Script
  }
}

if (-not $CRON_SECRET) {
  Write-Log "CRON_SECRET not set in $EnvFile"
  exit 1
}

$url = "$SiteUrl/api/cron/ebay-publish"
Write-Log "POST $url"

try {
  $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
    Authorization = "Bearer $CRON_SECRET"
    "Content-Type" = "application/json"
  } -Body "{}" -TimeoutSec 300
} catch {
  Write-Log "Request failed: $($_.Exception.Message)"
  exit 4
}

Write-Log ($response | ConvertTo-Json -Depth 6 -Compress)

if ($response.skipped -and -not $response.published) {
  Write-Log "Skipped: $($response.reason)"
  exit 2
}

if ($response.failed -gt 0) {
  Write-Log "Completed with $($response.failed) failure(s)."
  exit 3
}

Write-Log "Success. Published $($response.published), skipped $($response.skipped)."
exit 0
