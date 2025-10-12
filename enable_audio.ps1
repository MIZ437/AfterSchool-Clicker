# Enable all disabled audio devices
$devices = Get-PnpDevice -Class 'MEDIA' | Where-Object {$_.Status -eq 'Unknown'}

foreach($device in $devices) {
    Write-Host "Enabling: $($device.FriendlyName)"
    Enable-PnpDevice -InstanceId $device.InstanceId -Confirm:$false -ErrorAction SilentlyContinue
}

Write-Host "`nAll audio devices have been processed."
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
