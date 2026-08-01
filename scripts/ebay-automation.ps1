# Prince George Transport - full eBay automation
# Runs daily starting next Monday at 9:00 AM.
# 1. Upload API secrets from .ebay-credentials.env (if present)
# 2. Check readiness
# 3. Open admin for OAuth if secrets set but seller not connected
# 4. Publish radio listings when ready

param(
  [string]$SiteUrl = "https://prince-george-transport.pages.dev",
  [string]$CronEnvFile = "$PSScriptRoot\.ebay-cron.env",
  [string]$CredsEnvFile = "$PSScriptRoot\.ebay-credentials.env",
  [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$ProjectName = "prince-george-transport"

$logDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = Join-Path $logDir ("ebay-automation-{0:yyyy-MM-dd_HH-mm-ss}.log" -f (Get-Date))
$statusFile = Join-Path $logDir "ebay-automation-status.json"

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Add-Content -Path $logFile -Value $line
  Write-Host $line
}

function Read-EnvFile([string]$path) {
  $vars = @{}
  if (-not (Test-Path $path)) { return $vars }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $key = $matches[1].Trim()
      $val = $matches[2].Trim()
      if ($val) { $vars[$key] = $val }
    }
  }
  return $vars
}

function Invoke-EbayApi([string]$path, [string]$secret, [string]$method = "GET") {
  $uri = "$SiteUrl$path"
  $params = @{
    Uri = $uri
    Method = $method
    Headers = @{
      Authorization = "Bearer $secret"
    }
    TimeoutSec = 300
  }
  if ($method -eq "POST") {
    $params.Body = "{}"
    $params.Headers["Content-Type"] = "application/json"
  }
  return Invoke-RestMethod @params
}

function Upload-EbaySecrets([hashtable]$creds) {
  Push-Location $ProjectRoot
  try {
    Write-Log "Uploading eBay API secrets to Cloudflare..."
    $creds.EBAY_CLIENT_ID | npx wrangler pages secret put EBAY_CLIENT_ID --project-name=$ProjectName 2>&1 | Out-Null
    $creds.EBAY_CLIENT_SECRET | npx wrangler pages secret put EBAY_CLIENT_SECRET --project-name=$ProjectName 2>&1 | Out-Null
    $creds.EBAY_RUNAME | npx wrangler pages secret put EBAY_RUNAME --project-name=$ProjectName 2>&1 | Out-Null
    Write-Log "eBay API secrets uploaded."
    Start-Sleep -Seconds 8
  } finally {
    Pop-Location
  }
}

function Maybe-OpenConnect([object]$status) {
  if ($NoBrowser) { return }
  if ($status.nextStep -ne "connect_ebay_seller_account") { return }

  $flag = Join-Path $logDir ("connect-reminder-{0:yyyy-MM-dd}" -f (Get-Date))
  if (Test-Path $flag) {
    Write-Log "Connect reminder already shown today."
    return
  }

  Write-Log "Opening admin to connect eBay seller account (one-time OAuth)."
  Write-Log "PIN: see ADMIN_PIN in Cloudflare secrets. Marketing tab -> Connect eBay Account."
  Start-Process "$SiteUrl/admin.html"
  New-Item -ItemType File -Path $flag -Force | Out-Null
}

# --- main ---

Write-Log "=== eBay automation run ==="

$cronEnv = Read-EnvFile $CronEnvFile
$credsEnv = Read-EnvFile $CredsEnvFile
$secret = $cronEnv.CRON_SECRET
if (-not $secret) {
  Write-Log "Missing CRON_SECRET in $CronEnvFile. Run scripts\setup-ebay-cron.ps1"
  exit 1
}

$exitCode = 0

try {
  $status = Invoke-EbayApi "/api/cron/ebay-status" $secret "GET"
} catch {
  Write-Log "Status check failed: $($_.Exception.Message)"
  exit 4
}

Write-Log ("Status: nextStep={0} secrets={1} connected={2} radios={3}/{4} listed" -f `
  $status.nextStep, `
  $status.readiness.secretsConfigured, `
  $status.readiness.sellerConnected, `
  $status.radios.listed, `
  $status.radios.total)

    if (-not $status.readiness.secretsConfigured) {
  if ($credsEnv.EBAY_CLIENT_ID -and $credsEnv.EBAY_CLIENT_SECRET -and $credsEnv.EBAY_RUNAME) {
    Upload-EbaySecrets $credsEnv
    $status = Invoke-EbayApi "/api/cron/ebay-status" $secret "GET"
    Write-Log ("After secret upload: secrets={0} nextStep={1}" -f $status.readiness.secretsConfigured, $status.nextStep)
  } else {
    Write-Log "WAITING: eBay developer approval + credentials."
    Write-Log "Copy scripts\ebay-credentials.env.example to .ebay-credentials.env and fill in App ID, Cert ID, RuName."
    Write-Log "See SETUP-EBAY.md for RuName redirect URL setup."
    $exitCode = 2
  }
}

if ($status.nextStep -eq "connect_ebay_seller_account") {
  Maybe-OpenConnect $status
  Write-Log "WAITING: Connect eBay seller account in admin (one-time, requires your eBay login)."
  $exitCode = 2
} elseif ($status.nextStep -eq "all_radios_listed") {
  Write-Log "All radios already listed on eBay."
  $exitCode = 0
} elseif ($status.readiness.ready) {
  Write-Log "Publishing queued + radio listings..."
  try {
    $publish = Invoke-EbayApi "/api/cron/ebay-publish" $secret "POST"
    Write-Log ($publish | ConvertTo-Json -Depth 6 -Compress)

    if ($publish.published -gt 0) {
      Write-Log "SUCCESS: Published $($publish.published) listing(s). Buy on eBay buttons are live."
      $exitCode = 0
    } elseif ($publish.skipped) {
      Write-Log "Skipped: $($publish.reason)"
      $exitCode = 2
    } elseif ($publish.failed -gt 0) {
      Write-Log "Publish completed with $($publish.failed) failure(s)."
      $exitCode = 3
    }
  } catch {
    Write-Log "Publish failed: $($_.Exception.Message)"
    $exitCode = 4
  }
}

@{
  finishedAt = (Get-Date).ToString("o")
  exitCode = $exitCode
  nextStep = $status.nextStep
  readiness = $status.readiness
  radios = $status.radios
  logFile = $logFile
} | ConvertTo-Json -Depth 5 | Set-Content -Path $statusFile -Encoding UTF8

Write-Log "=== Done (exit $exitCode). Status: $statusFile ==="
exit $exitCode
