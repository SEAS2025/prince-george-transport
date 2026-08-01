# Generate CRON_SECRET, save locally, and upload to Cloudflare Pages.
# Run once before registering the scheduled task.

$Project = "prince-george-transport"
$EnvFile = Join-Path $PSScriptRoot ".ebay-cron.env"

Write-Host "Prince George Transport — eBay cron secret setup" -ForegroundColor Cyan

if (Test-Path $EnvFile) {
  $existing = Get-Content $EnvFile -Raw
  if ($existing -match "CRON_SECRET=(.+)") {
    $reuse = Read-Host "CRON_SECRET already exists in .ebay-cron.env. Reuse it? (Y/n)"
    if ($reuse -eq "" -or $reuse -match "^[Yy]") {
      $secret = $matches[1].Trim()
      Write-Host "Reusing existing secret."
    }
  }
}

if (-not $secret) {
  $secret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
  @"
# Local cron auth — do not commit
CRON_SECRET=$secret
SITE_URL=https://prince-george-transport.pages.dev
"@ | Set-Content -Path $EnvFile -Encoding UTF8
  Write-Host "Wrote $EnvFile"
}

Write-Host "Uploading CRON_SECRET to Cloudflare Pages..."
$secret | npx wrangler pages secret put CRON_SECRET --project-name=$Project

Write-Host ""
Write-Host "Done. Next: .\scripts\register-ebay-schedule.ps1" -ForegroundColor Green
