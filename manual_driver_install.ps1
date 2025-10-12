# Manual driver installation helper
Write-Host "=== Audio Hardware Information ===" -ForegroundColor Cyan

# Get audio codec info
Write-Host "`nAudio Codec Information:" -ForegroundColor Yellow
Get-PnpDevice -Class 'MEDIA' | Format-Table Status, FriendlyName, InstanceId -AutoSize

Write-Host "`n=== Checking for High Definition Audio Controller ===" -ForegroundColor Cyan
$hdaControllers = Get-PnpDevice | Where-Object {
    $_.FriendlyName -match 'High Definition Audio' -or
    $_.Class -eq 'HDAUDIO'
}

if ($hdaControllers) {
    Write-Host "Found HD Audio Controllers:" -ForegroundColor Green
    $hdaControllers | Format-Table Status, FriendlyName -AutoSize
} else {
    Write-Host "WARNING: No HD Audio Controller found!" -ForegroundColor Red
    Write-Host "This means the audio hardware is not detected by Windows." -ForegroundColor Red
}

Write-Host "`n=== Recommended Actions ===" -ForegroundColor Cyan
Write-Host "1. Download Realtek Audio Driver from Mouse Computer support site"
Write-Host "2. Install the driver with Administrator privileges"
Write-Host "3. Restart the computer"
Write-Host "4. Check if internal speakers/audio jack works"

Write-Host "`nPress any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
