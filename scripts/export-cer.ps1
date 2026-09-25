$pfx = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("certificate.pfx", "OcalBrowser2026")
$cerBytes = $pfx.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
[System.IO.File]::WriteAllBytes("GamingNetworkStudioMediaGroup.cer", $cerBytes)
Write-Host "Exported GamingNetworkStudioMediaGroup.cer successfully." -ForegroundColor Green
