# Trust the Gaming Network Studio Media Group certificate on the current machine
$certPath = Join-Path $PSScriptRoot "..\certificate.pfx"
if (Test-Path $certPath) {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath, "OcalBrowser2026")
    
    $storeRoot = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
    $storeRoot.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $storeRoot.Add($cert)
    $storeRoot.Close()

    $storePub = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "CurrentUser")
    $storePub.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $storePub.Add($cert)
    $storePub.Close()

    Write-Host "Successfully trusted Gaming Network Studio Media Group in CurrentUser Root and TrustedPublisher stores." -ForegroundColor Green
} else {
    Write-Host "certificate.pfx not found at $certPath" -ForegroundColor Red
}
