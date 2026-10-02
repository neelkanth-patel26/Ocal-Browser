# Trust Gaming Network Studio certificate on Windows machine
# Fixes error 0x800B010A for MSIX / AppX packages.
param([switch]$NoPrompt)

$certFile = Join-Path $PSScriptRoot "..\GamingNetworkStudioMediaGroup.cer"
if (-not (Test-Path $certFile)) {
    $certFile = Join-Path $PSScriptRoot "GamingNetworkStudioMediaGroup.cer"
}

if (-not (Test-Path $certFile)) {
    Write-Error "Certificate file GamingNetworkStudioMediaGroup.cer not found!"
    exit 1
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "Installing certificate to Local Machine stores..." -ForegroundColor Cyan
    certutil -addstore -f "Root" $certFile
    certutil -addstore -f "TrustedPeople" $certFile
    certutil -addstore -f "TrustedPublisher" $certFile
    Write-Host "`nSUCCESS: Certificate is now trusted in LocalMachine Root & TrustedPeople!" -ForegroundColor Green
    Write-Host "You can now double-click the .appx / .msix package to install." -ForegroundColor Green
} else {
    Write-Host "Installing to CurrentUser stores..." -ForegroundColor Yellow
    certutil -addstore -user -f "TrustedPeople" $certFile
    certutil -addstore -user -f "TrustedPublisher" $certFile
    Write-Host "`nNotice: Windows App Installer requires LocalMachine stores to verify MSIX/AppX packages." -ForegroundColor Yellow
    Write-Host "Run this script in PowerShell as Administrator to trust machine-wide:" -ForegroundColor Cyan
    Write-Host "  Start-Process powershell -Verb RunAs -ArgumentList '-ExecutionPolicy Bypass -File `"$PSCommandPath`"'" -ForegroundColor White
}
exit 0
