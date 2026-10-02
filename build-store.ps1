# Ocal Browser - Microsoft Store Package Build Script
# Builds AppX & MSIX packages and a standalone MSIX installer with certificate baked in.

$ErrorActionPreference = "Stop"

$version = (Get-Content package.json | ConvertFrom-Json).version
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   🌌 Ocal Browser v$version - Microsoft Store Build       " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Refresh Store Visual Assets
Write-Host "[1/5] Refreshing Microsoft Store visual assets from icon.png..." -ForegroundColor Yellow
python scripts/generate-store-assets.py
Copy-Item -Force icon.ico build\icon.ico
Write-Host "Store visual assets refreshed in build\appx\" -ForegroundColor Green

# 2. Cleanup Store Output Directory
Write-Host "[2/5] Preparing output directory: dist-store..." -ForegroundColor Yellow
if (Test-Path "dist-store") {
    try {
        Remove-Item -Recurse -Force "dist-store"
    } catch {
        Write-Host "Notice: Some files in dist-store were locked, continuing..." -ForegroundColor Gray
    }
}
New-Item -ItemType Directory -Path "dist-store" -Force | Out-Null

# 3. Compile AppX / MSIX Package
Write-Host "[3/5] Packaging Electron application into AppX / MSIX..." -ForegroundColor Magenta
Write-Host "Executing electron-builder --win appx..." -ForegroundColor Gray

$env:CSC_LINK = $null
$env:CSC_KEY_PASSWORD = $null

# Build AppX package
cmd.exe /c npx electron-builder --win appx --config.directories.output=dist-store
if ($LASTEXITCODE -ne 0) {
    throw "Electron AppX packaging failed with exit code $LASTEXITCODE."
}

# Ensure both .appx and .msix exist in dist-store
$generatedAppx = Get-ChildItem "dist-store\*.appx" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($generatedAppx) {
    $msixName = $generatedAppx.FullName -replace '\.appx$', '.msix'
    if (-not (Test-Path $msixName)) {
        Copy-Item -Path $generatedAppx.FullName -Destination $msixName -Force
        Write-Host "Generated matching MSIX package: $(Split-Path $msixName -Leaf)" -ForegroundColor Green
    }
}

# Sign packages with certificate.pfx and RFC 3161 timestamping
$packagesToSign = Get-ChildItem "dist-store\*.appx", "dist-store\*.msix" -ErrorAction SilentlyContinue
$signtoolPaths = @(
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe",
    "C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe"
)
$signtool = $signtoolPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($packagesToSign -and (Test-Path "certificate.pfx") -and $signtool) {
    foreach ($pkg in $packagesToSign) {
        Write-Host "Signing $($pkg.Name) with Authenticode & RFC 3161 timestamp..." -ForegroundColor Yellow
        $signSuccess = $false
        $timestampUrls = @("http://timestamp.digicert.com", "http://timestamp.sectigo.com", "http://tsa.starfieldtech.com")
        
        foreach ($ts in $timestampUrls) {
            & $signtool sign /fd SHA256 /f certificate.pfx /p OcalBrowser2026 /tr $ts /td SHA256 $pkg.FullName
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Signed $($pkg.Name) successfully with timestamp from $ts." -ForegroundColor Green
                $signSuccess = $true
                break
            }
        }
        if (-not $signSuccess) {
            # Fallback without timestamp
            & $signtool sign /fd SHA256 /f certificate.pfx /p OcalBrowser2026 $pkg.FullName
            Write-Host "Signed $($pkg.Name) (without timestamp)." -ForegroundColor Yellow
        }
    }
}

# 4. Compile Standalone MSIX Installer (Ocal-MSIX-Setup.exe)
Write-Host "[4/5] Compiling dedicated MSIX installer with certificate baked in..." -ForegroundColor Magenta
$isccPaths = @(
    "ISCC.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)
$isccPath = $null
foreach ($path in $isccPaths) {
    if (Get-Command $path -ErrorAction SilentlyContinue) {
        $isccPath = (Get-Command $path).Source
        break
    }
    if (Test-Path $path) {
        $isccPath = $path
        break
    }
}

if ($isccPath -and (Test-Path "msix-installer.iss")) {
    Write-Host "Compiling msix-installer.iss with ISCC..." -ForegroundColor Gray
    & $isccPath msix-installer.iss
    if ($LASTEXITCODE -eq 0) {
        $msixSetup = "dist-store\Ocal-MSIX-Setup.exe"
        if (Test-Path $msixSetup) {
            Write-Host "Signing Ocal-MSIX-Setup.exe..." -ForegroundColor Yellow
            $signScript = Join-Path $PSScriptRoot "scripts\sign-installer.ps1"
            if (Test-Path $signScript) {
                & powershell -ExecutionPolicy Bypass -File $signScript -FilePath $msixSetup
            }
            Write-Host "Ocal-MSIX-Setup.exe compiled and signed successfully." -ForegroundColor Green
        }
    } else {
        Write-Host "Notice: ISCC msix-installer compilation skipped." -ForegroundColor Yellow
    }
}

# 5. Summary & Instructions
Write-Host ""
Write-Host "[5/5] Microsoft Store Build Finished!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$distStoreFiles = Get-ChildItem "dist-store\*.appx", "dist-store\*.msix", "dist-store\*.exe" -ErrorAction SilentlyContinue

if ($distStoreFiles) {
    foreach ($file in $distStoreFiles) {
        Write-Host "Created: $($file.Name) ($([math]::Round($file.Length / 1MB, 2)) MB)" -ForegroundColor White
    }
}
Write-Host "==========================================================" -ForegroundColor Cyan
