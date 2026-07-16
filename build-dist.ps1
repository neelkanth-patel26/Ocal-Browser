# Ocal Browser Premium Build Script
# This script automates the full Electron build and Inno Setup compilation process.

$ErrorActionPreference = "Stop"

$version = (Get-Content package.json | ConvertFrom-Json).version
Write-Host "--- 🌌 Ocal Browser v$version Premium Build ---" -ForegroundColor Cyan

# 1. Directory Cleanup
Write-Host "[1/4] Cleaning build artifacts..." -ForegroundColor Gray
if (Test-Path "dist-inno") { Remove-Item -Recurse -Force "dist-inno" }
if (Test-Path "out") { Remove-Item -Recurse -Force "out" }
if (Test-Path "dist-builder") { Remove-Item -Recurse -Force "dist-builder" }
New-Item -ItemType Directory -Path "dist-inno" -Force | Out-Null

# 2. Electron Packaging
Write-Host "[2/4] Packaging Electron application..." -ForegroundColor Yellow
cmd.exe /c npx electron-builder --dir
if ($LASTEXITCODE -ne 0) { throw "Electron packaging failed." }

# 2b. Stamp Custom Icon into Executable
Write-Host "[2b/4] Stamping custom icon into executable..." -ForegroundColor Yellow
$exePath = "dist-builder\win-unpacked\Ocal Browser.exe"
$iconPath = "icon.ico"

if (Test-Path $exePath) {
    # Find rcedit from electron-builder cache
    $rceditPaths = Get-ChildItem -Path "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Filter "rcedit-x64.exe" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    $rceditPath = $null
    if ($rceditPaths.Count -gt 0) {
        $rceditPath = $rceditPaths[0].FullName
    }

    if ($rceditPath -and (Test-Path $rceditPath)) {
        Write-Host "Using rcedit at: $rceditPath" -ForegroundColor Gray
        & $rceditPath $exePath --set-icon $iconPath
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Custom icon stamped successfully." -ForegroundColor Green
        } else {
            Write-Host "WARNING: rcedit icon stamp failed (exit code $LASTEXITCODE)." -ForegroundColor Red
        }
    } else {
        Write-Host "WARNING: rcedit-x64.exe not found in electron-builder cache. Icon may show Electron default." -ForegroundColor Red
    }
} else {
    Write-Host "WARNING: Executable not found at $exePath. Skipping icon stamp." -ForegroundColor Red
}

# 3. Inno Setup Compilation
Write-Host "[3/4] Compiling Inno Setup installer..." -ForegroundColor Magenta

$isccPaths = @(
    "ISCC.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 5\ISCC.exe"
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

if (-not $isccPath) {
    Write-Host "WARNING: ISCC.exe (Inno Setup) not found. Skipping installer compilation." -ForegroundColor Red
    Write-Host "Please install Inno Setup 6 or add it to your PATH." -ForegroundColor Gray
} else {
    Write-Host "Using ISCC at: $isccPath" -ForegroundColor Gray
    & $isccPath installer.iss
    if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed." }
}

# 4. Final Summary
Write-Host "[4/4] Build Complete!" -ForegroundColor Green
$setupFile = Get-ChildItem "dist-inno\Ocal-*-Setup.exe" -ErrorAction SilentlyContinue
if ($setupFile) {
    Write-Host "Setup Executable: $($setupFile.FullName)" -ForegroundColor White
} else {
    Write-Host "Binaries location: .\dist-builder\win-unpacked\Ocal Browser.exe" -ForegroundColor White
}

Write-Host "The new 'Antigravity' installer UI will launch automatically when this setup finishes." -ForegroundColor Cyan
