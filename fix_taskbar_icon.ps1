$projectDir = "c:\Project\Gaming Network\Software\Brower"
$icoPath = Join-Path $projectDir "icon.ico"
$electronExe = Join-Path $projectDir "node_modules\electron\dist\electron.exe"

Write-Host "Setting up Ocal Browser shortcut and fixing taskbar icon..."

# 1. Update/Remove stale Electron.lnk from Start Menu
$electronLnk = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Electron.lnk'
if (Test-Path $electronLnk) {
    Write-Host "Removing stale Electron.lnk: $electronLnk"
    Remove-Item $electronLnk -Force -ErrorAction SilentlyContinue
}

# 2. Create / Update Ocal Browser.lnk in Start Menu
$ocalLnkPath = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Ocal Browser.lnk'
$wsh = New-Object -ComObject WScript.Shell
$lnk = $wsh.CreateShortcut($ocalLnkPath)
$lnk.TargetPath = $electronExe
$lnk.Arguments = "`"$projectDir`""
$lnk.WorkingDirectory = $projectDir
$lnk.IconLocation = "$icoPath,0"
$lnk.Description = "Ocal Browser"
$lnk.Save()
Write-Host "Ocal Browser.lnk created/updated successfully pointing to $icoPath"

# 3. Create / Update shortcut in Desktop as well for good measure
$desktopLnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Ocal Browser.lnk'
$lnk2 = $wsh.CreateShortcut($desktopLnk)
$lnk2.TargetPath = $electronExe
$lnk2.Arguments = "`"$projectDir`""
$lnk2.WorkingDirectory = $projectDir
$lnk2.IconLocation = "$icoPath,0"
$lnk2.Description = "Ocal Browser"
$lnk2.Save()

# 4. Clear Windows Icon Cache
Write-Host "Clearing icon cache..."
try {
    ie4uinit.exe -show
} catch {}

Write-Host "Done setting up icon and shortcuts."
