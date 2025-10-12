# Install generic Microsoft HD Audio driver
Write-Host "=== Installing Generic HD Audio Driver ===" -ForegroundColor Cyan

# Get the HD Audio Controller
$hdController = Get-PnpDevice | Where-Object {
    $_.FriendlyName -match 'High Definition Audio' -and
    $_.Status -eq 'OK' -and
    $_.Class -ne 'MEDIA'
} | Select-Object -First 1

if ($hdController) {
    Write-Host "Found HD Audio Controller: $($hdController.FriendlyName)" -ForegroundColor Green
    Write-Host "Updating driver to Microsoft HD Audio Class Driver..." -ForegroundColor Yellow

    # Update driver to generic Microsoft driver
    $result = pnputil /add-driver "C:\Windows\INF\hdaudio.inf" /install
    Write-Host $result

    Write-Host "`nRestarting audio service..."
    Restart-Service Audiosrv -Force

    Write-Host "`nScanning for new hardware..."
    pnputil /scan-devices

    Start-Sleep -Seconds 3

    Write-Host "`n=== Current Audio Endpoints ===" -ForegroundColor Cyan
    Get-PnpDevice -Class 'AudioEndpoint' | Where-Object {$_.Status -eq 'OK'} | Format-Table FriendlyName -AutoSize

    Write-Host "`nIf no speakers appeared, you MUST install Realtek or Intel audio driver." -ForegroundColor Yellow
} else {
    Write-Host "ERROR: No HD Audio Controller found!" -ForegroundColor Red
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
