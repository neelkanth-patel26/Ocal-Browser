[Setup]
AppName=Ocal Browser
AppVersion=1.1.1
DefaultDirName={autopf}\Ocal
DefaultGroupName=Ocal
OutputDir=dist-inno
OutputBaseFilename=Ocal-1.1.1-Setup
SetupIconFile=icon.ico
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
LicenseFile=license.txt

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "D:\Brower\out\ocal-win32-x64\ocal.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\Brower\out\ocal-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Ocal Browser"; Filename: "{app}\ocal.exe"
Name: "{autodesktop}\Ocal Browser"; Filename: "{app}\ocal.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\ocal.exe"; Description: "{cm:LaunchProgram,Ocal Browser}"; Flags: nowait postinstall
