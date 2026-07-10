# Set eBay API secrets on Cloudflare Pages
# Run from project root after creating your eBay Production keyset.
# See SETUP-EBAY.md for full instructions.

$Project = "prince-george-transport"

Write-Host "Prince George Transport — eBay secret setup" -ForegroundColor Cyan
Write-Host "Project: $Project"
Write-Host ""
Write-Host "You need from https://developer.ebay.com/my/keys (Production):"
Write-Host "  - App ID (Client ID)"
Write-Host "  - Cert ID (Client Secret)"
Write-Host "  - RuName (from User Tokens → Redirect URL)"
Write-Host ""

$clientId = Read-Host "EBAY_CLIENT_ID (App ID)"
$clientSecret = Read-Host "EBAY_CLIENT_SECRET (Cert ID)" -AsSecureString
$ruName = Read-Host "EBAY_RUNAME"

$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
$plainSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$clientId | npx wrangler pages secret put EBAY_CLIENT_ID --project-name=$Project
$plainSecret | npx wrangler pages secret put EBAY_CLIENT_SECRET --project-name=$Project
$ruName | npx wrangler pages secret put EBAY_RUNAME --project-name=$Project

Write-Host ""
Write-Host "Done. Redeploy: npm run deploy" -ForegroundColor Green
Write-Host "Then Admin -> Marketing -> Connect eBay Account"
