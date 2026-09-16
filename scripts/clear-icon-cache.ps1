# Clear Windows Icon Cache
Write-Host "Clearing Windows Icon Cache..." -ForegroundColor Yellow

# 1. Stop Explorer
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 800

# 2. Delete legacy IconCache.db
$legacyCache = "$env:LOCALAPPDATA\IconCache.db"
if (Test-Path $legacyCache) {
    Remove-Item -Force $legacyCache -ErrorAction SilentlyContinue
    Write-Host "Removed legacy IconCache.db" -ForegroundColor Gray
}

# 3. Delete modern Explorer icon cache databases
$explorerCaches = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache*" -Force -ErrorAction SilentlyContinue
foreach ($file in $explorerCaches) {
    try {
        Remove-Item -Force $file.FullName -ErrorAction Stop
        Write-Host "Removed $($file.Name)" -ForegroundColor Gray
    } catch {
        # If locked, attempt via cmd
        cmd /c del /f /q "$($file.FullName)" 2>$null
    }
}

# 4. Restart Explorer
Start-Process explorer.exe
Start-Sleep -Milliseconds 800

# 5. Notify shell to refresh
try {
    Start-Process ie4uinit.exe -ArgumentList "-show" -NoNewWindow -Wait -ErrorAction SilentlyContinue
} catch {}

Write-Host "Windows Icon Cache successfully cleared and Explorer refreshed!" -ForegroundColor Green
