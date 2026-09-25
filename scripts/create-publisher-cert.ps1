# Generates official Authenticode Code Signing Certificate for Gaming Network Studio Media Group
$certParams = @{
    Type = "CodeSigningCert"
    Subject = "CN=Gaming Network Studio Media Group, O=Gaming Network Studio Media Group, L=Ahmedabad, S=Gujarat, C=IN"
    CertStoreLocation = "Cert:\CurrentUser\My"
    HashAlgorithm = "SHA256"
    KeyLength = 2048
    NotAfter = (Get-Date).AddYears(5)
    FriendlyName = "Gaming Network Studio Media Group - Ocal Browser Authenticode Publisher"
}

$cert = New-SelfSignedCertificate @certParams
$pfxPass = "OcalBrowser2026"
$securePass = ConvertTo-SecureString -String $pfxPass -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "certificate.pfx" -Password $securePass | Out-Null
Write-Host "Created certificate.pfx with Thumbprint: $($cert.Thumbprint)"
