# Trust the Gaming Network Studio Media Group certificate on the current machine
# Works both from repo root (development) and from {app}\scripts\ (post-install)
$certPath = Join-Path $PSScriptRoot "..\certificate.pfx"
if (-not (Test-Path $certPath)) {
    # Fallback: same directory as script
    $certPath = Join-Path $PSScriptRoot "certificate.pfx"
}

if (Test-Path $certPath) {
    try {
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath, "OcalBrowser2026")

        # Add to Trusted Root so Windows trusts the issuer
        $storeRoot = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
        $storeRoot.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
        $storeRoot.Add($cert)
        $storeRoot.Close()

        # Add to Trusted Publishers so SmartScreen passes signed EXEs
        $storePub = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "CurrentUser")
        $storePub.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
        $storePub.Add($cert)
        $storePub.Close()

        Write-Host "Successfully trusted Gaming Network Studio Media Group in CurrentUser Root and TrustedPublisher stores." -ForegroundColor Green
    } catch {
        Write-Host "Warning: Could not import certificate: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "certificate.pfx not found at $certPath — skipping trust step." -ForegroundColor Yellow
}
