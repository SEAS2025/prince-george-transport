# Register daily eBay automation starting next Monday at 9:00 AM.

$TaskName = "PrinceGeorgeTransport-EbayAutomation"
$ScriptPath = Join-Path $PSScriptRoot "ebay-automation.ps1"

if (-not (Test-Path (Join-Path $PSScriptRoot ".ebay-cron.env"))) {
  Write-Host "Run scripts\setup-ebay-cron.ps1 first." -ForegroundColor Yellow
  exit 1
}

function Get-NextMonday9am {
  $now = Get-Date
  $days = ([int][DayOfWeek]::Monday - [int]$now.DayOfWeek + 7) % 7
  if ($days -eq 0 -and $now.TimeOfDay.TotalHours -ge 9) { $days = 7 }
  if ($days -eq 0) {
    return $now.Date.AddHours(9)
  }
  return $now.Date.AddDays($days).AddHours(9)
}

$FirstRun = Get-NextMonday9am

# Remove legacy task name if present
Unregister-ScheduledTask -TaskName "PrinceGeorgeTransport-EbayPublish" -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At "9:00AM"
$trigger.StartBoundary = $FirstRun.ToString("yyyy-MM-dd'T'HH:mm:ss")

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 45)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Prince George Transport: upload eBay secrets, connect reminder, publish radios. Daily from Monday 9 AM." `
  -Force | Out-Null

Write-Host "Scheduled task registered: $TaskName" -ForegroundColor Green
Write-Host "First run:  $FirstRun ($($FirstRun.DayOfWeek), then daily at 9:00 AM)"
Write-Host "Script:     $ScriptPath"
Write-Host "Logs:       $PSScriptRoot\logs\"
Write-Host ""
Write-Host "Before Monday: copy ebay-credentials.env.example to .ebay-credentials.env"
Write-Host "               and add your eBay App ID, Cert ID, and RuName when approved."
Write-Host ""
Write-Host "Test now:   powershell -File `"$ScriptPath`""
Write-Host "Remove:     Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
