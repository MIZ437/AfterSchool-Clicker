# Try to enable the working HD Audio Controller
Write-Host "Attempting to configure HD Audio Controller..." -ForegroundColor Cyan

# Find the OK HD Audio Controller
$workingController = Get-PnpDevice | Where-Object {
    $_.FriendlyName -eq 'High Definition Audio コントローラー' -and $_.Status -eq 'OK'
}

if ($workingController) {
    Write-Host "Found working controller: $($workingController.FriendlyName)" -ForegroundColor Green
    Write-Host "Instance ID: $($workingController.InstanceId)" -ForegroundColor Yellow

    # Disable and re-enable to reset
    Write-Host "`nResetting the controller..."
    Disable-PnpDevice -InstanceId $workingController.InstanceId -Confirm:$false
    Start-Sleep -Seconds 2
    Enable-PnpDevice -InstanceId $workingController.InstanceId -Confirm:$false
    Start-Sleep -Seconds 2

    # Scan for new devices
    Write-Host "Scanning for audio devices..."
    pnputil /scan-devices

    Write-Host "`nDone! Check sound settings for new audio output devices."
} else {
    Write-Host "No working HD Audio Controller found." -ForegroundColor Red
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
