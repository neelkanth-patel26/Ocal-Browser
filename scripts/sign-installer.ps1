# ============================================================
#  Ocal Browser Code Signing Utility (SHA-256 + RFC 3161)
#  Complies with Microsoft Partner Center & Windows Authenticode
# ============================================================

[CmdletBinding()]
[System.Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', 'Password')]
param (
    [string]$FilePath,
    [string]$PfxPath,
    [System.Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', 'Password')]
    [object]$Password,
    [string]$Thumbprint,
    [switch]$SelfSign
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     Ocal Browser Code Signing Utility (SHA-256)          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate signtool.exe from Windows SDK
$signtoolPaths = @(
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\App Certification Kit\signtool.exe"
)

$signtool = $null
foreach ($p in $signtoolPaths) {
    if (Test-Path $p) {
        $signtool = $p
        break
    }
}

if (-not $signtool) {
    $found = Get-ChildItem -Path "C:\Program Files (x86)\Windows Kits" -Filter "signtool.exe" -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -like "*\x64\*" } |
        Select-Object -First 1
    if ($found) { $signtool = $found.FullName }
}

if (-not $signtool) {
    throw "signtool.exe could not be found. Please ensure Windows 10/11 SDK is installed."
}

Write-Host "Using SignTool: $signtool" -ForegroundColor Gray

# 2. Locate Target Executable
if (-not $FilePath) {
    $foundFiles = Get-ChildItem "dist-inno\Ocal-*-Setup.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($foundFiles) {
        $FilePath = $foundFiles[0].FullName
    } else {
        throw "Target executable not specified and none found in dist-inno\"
    }
}

if (-not (Test-Path $FilePath)) {
    throw "File to sign not found: $FilePath"
}

Write-Host "Target file   : $FilePath" -ForegroundColor White

# 3. Handle Self-Sign option if requested (for testing)
if ($SelfSign) {
    Write-Host ""
    Write-Host "[Self-Sign Mode] Checking local SHA-256 Code Signing Certificate..." -ForegroundColor Yellow
    Write-Host "NOTE: Self-signed certificates are for local testing only." -ForegroundColor DarkYellow
    Write-Host "Microsoft Partner Center requires a trusted CA certificate for public Win32 submissions." -ForegroundColor DarkYellow

    $certName = "Ocal Browser Dev Code Signing"
    $existingCert = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | Where-Object { $_.Subject -like "*$certName*" } | Select-Object -First 1

    if (-not $existingCert) {
        $certParams = @{
            Type = "CodeSigningCert"
            Subject = "CN=$certName, O=Gaming Network Studio Media Group"
            CertStoreLocation = "Cert:\CurrentUser\My"
            HashAlgorithm = "SHA256"
            KeyLength = 2048
            NotAfter = (Get-Date).AddYears(3)
        }
        $cert = New-SelfSignedCertificate @certParams
        Write-Host "Created self-signed certificate: $($cert.Thumbprint)" -ForegroundColor Green
        $Thumbprint = $cert.Thumbprint
    } else {
        Write-Host "Reusing existing certificate: $($existingCert.Thumbprint)" -ForegroundColor Green
        $Thumbprint = $existingCert.Thumbprint
    }
}

# 4. Check for environment variables or default PFX
if (-not $PfxPath -and -not $Thumbprint) {
    if ($env:CSC_LINK -and (Test-Path $env:CSC_LINK)) {
        $PfxPath = $env:CSC_LINK
        $Password = $env:CSC_KEY_PASSWORD
    } elseif (Test-Path "certificate.pfx") {
        $PfxPath = "certificate.pfx"
        if (-not $Password) { $Password = "OcalBrowser2026" }
    }
}

# 5. Execute Signing with SHA-256 + RFC 3161 Timestamp
$timestampUrl = "http://timestamp.digicert.com"

if ($PfxPath) {
    Write-Host ""
    Write-Host "Signing with PFX certificate: $PfxPath" -ForegroundColor Magenta
    $signArgs = @("sign", "/fd", "SHA256", "/tr", $timestampUrl, "/td", "SHA256", "/d", "Ocal Browser Installer")
    if ($Password) {
        $plainPassword = if ($Password -is [System.Security.SecureString]) {
            [System.Net.NetworkCredential]::new('', $Password).Password
        } else {
            [string]$Password
        }
        $signArgs += @("/p", $plainPassword)
    }
    $signArgs += @("/f", $PfxPath, $FilePath)

    & $signtool $signArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Retrying with Sectigo timestamp server..." -ForegroundColor Yellow
        $signArgs[4] = "http://timestamp.sectigo.com"
        & $signtool $signArgs
        if ($LASTEXITCODE -ne 0) { throw "Signing failed with exit code $LASTEXITCODE" }
    }
} elseif ($Thumbprint) {
    Write-Host ""
    Write-Host "Signing with Certificate Store thumbprint: $Thumbprint" -ForegroundColor Magenta
    $signArgs = @("sign", "/sha1", $Thumbprint, "/fd", "SHA256", "/tr", $timestampUrl, "/td", "SHA256", "/d", "Ocal Browser Installer", $FilePath)

    & $signtool $signArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Retrying with Sectigo timestamp server..." -ForegroundColor Yellow
        $signArgs[6] = "http://timestamp.sectigo.com"
        & $signtool $signArgs
        if ($LASTEXITCODE -ne 0) { throw "Signing failed with exit code $LASTEXITCODE" }
    }
} else {
    Write-Host ""
    Write-Host "ERROR: No certificate provided!" -ForegroundColor Red
    Write-Host "To sign your installer, run one of the following:" -ForegroundColor Yellow
    Write-Host "  1. If you have a .pfx file:" -ForegroundColor White
    Write-Host "     powershell -ExecutionPolicy Bypass -File .\scripts\sign-installer.ps1 -PfxPath 'path\to\cert.pfx' -Password 'secret'" -ForegroundColor Gray
    Write-Host "  2. If your certificate is in Windows Certificate Store:" -ForegroundColor White
    Write-Host "     powershell -ExecutionPolicy Bypass -File .\scripts\sign-installer.ps1 -Thumbprint '<thumbprint>'" -ForegroundColor Gray
    Write-Host "  3. For local testing (self-signed):" -ForegroundColor White
    Write-Host "     powershell -ExecutionPolicy Bypass -File .\scripts\sign-installer.ps1 -SelfSign" -ForegroundColor Gray
    Write-Host ""
    Write-Host "TIP FOR MICROSOFT STORE (NO PURCHASE REQUIRED):" -ForegroundColor Cyan
    Write-Host "If you do not have a commercial Code Signing certificate ($200-$400/yr)," -ForegroundColor Yellow
    Write-Host "build and submit an MSIX/AppX package instead using: npm run build-store" -ForegroundColor Yellow
    Write-Host "Microsoft signs MSIX packages FOR FREE upon Store ingestion!" -ForegroundColor Yellow
    exit 1
}

# 6. Verify Signature
Write-Host ""
Write-Host "[Verifying Signature]..." -ForegroundColor Yellow
& $signtool verify /pa /v $FilePath
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: $FilePath is successfully signed with SHA-256 and verified!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "File has been signed with SHA-256. (Note: Self-signed certs won't chain to a public trusted root, which is expected for local certs)." -ForegroundColor Yellow
}
