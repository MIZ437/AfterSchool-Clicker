# Complete audio fix script
Write-Host "=== Audio Device Recovery Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Scan for hardware changes
Write-Host "[1/4] Scanning for hardware changes..." -ForegroundColor Yellow
pnputil /scan-devices
Start-Sleep -Seconds 2

# Step 2: Show all audio devices
Write-Host "`n[2/4] Current audio devices:" -ForegroundColor Yellow
$audioDevices = Get-PnpDevice -Class 'MEDIA'
$audioDevices | Format-Table Status, FriendlyName -AutoSize

# Step 3: Enable all Unknown/Error audio devices
Write-Host "`n[3/4] Attempting to enable all audio devices..." -ForegroundColor Yellow
foreach($device in $audioDevices) {
    if($device.Status -ne 'OK') {
        Write-Host "  Enabling: $($device.FriendlyName)" -ForegroundColor Green
        try {
            Enable-PnpDevice -InstanceId $device.InstanceId -Confirm:$false -ErrorAction Stop
            Write-Host "    Success!" -ForegroundColor Green
        } catch {
            Write-Host "    Failed: $_" -ForegroundColor Red
        }
    }
}

# Step 4: Restart audio service
Write-Host "`n[4/4] Restarting Windows Audio service..." -ForegroundColor Yellow
Restart-Service -Name Audiosrv -Force
Start-Sleep -Seconds 2

# Final check
Write-Host "`n=== Final Status ===" -ForegroundColor Cyan
Get-PnpDevice -Class 'MEDIA' | Format-Table Status, FriendlyName -AutoSize

Write-Host "`n=== Audio Endpoints ===" -ForegroundColor Cyan
Get-PnpDevice -Class 'AudioEndpoint' | Where-Object {$_.Status -eq 'OK'} | Format-Table FriendlyName -AutoSize

Write-Host "`nScript completed. Please check if audio is working now." -ForegroundColor Green
Write-Host "If still no sound, you may need to install audio drivers from manufacturer."
Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
