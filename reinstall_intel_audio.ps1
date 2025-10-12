# Reinstall Intel audio driver
Write-Host "Scanning for hardware changes..." -ForegroundColor Cyan

$intelDevices = Get-PnpDevice | Where-Object {
    ($_.FriendlyName -match 'Intel' -or $_.FriendlyName -match 'Smart Sound') -and
    ($_.Class -eq 'MEDIA' -or $_.Class -eq 'AudioEndpoint')
}

foreach($device in $intelDevices) {
    Write-Host "Found: $($device.FriendlyName) - Status: $($device.Status)" -ForegroundColor Yellow

    if($device.Status -ne 'OK') {
        Write-Host "  Attempting to enable..." -ForegroundColor Green
        Enable-PnpDevice -InstanceId $device.InstanceId -Confirm:$false -ErrorAction SilentlyContinue
    }
}

Write-Host "`nScanning for new hardware..."
pnputil /scan-devices

Write-Host "`nDone! Please check sound settings."
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
