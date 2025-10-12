# Check Intel audio devices
Write-Host "=== Intel Audio Devices ===" -ForegroundColor Cyan
Get-PnpDevice | Where-Object {$_.FriendlyName -match 'Intel' -and $_.Class -eq 'MEDIA'} | Format-List Status, FriendlyName, InstanceId

Write-Host "`n=== All Audio Endpoints ===" -ForegroundColor Cyan
Get-PnpDevice -Class 'AudioEndpoint' | Format-Table Status, FriendlyName -AutoSize

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
