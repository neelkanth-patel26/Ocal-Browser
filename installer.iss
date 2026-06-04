[Setup]
AppName=Ocal Browser
AppVersion=6.02.00 Beta
AppPublisher=Gaming Network Studio Media Group
AppPublisherURL=https://github.com/neelkanth-patel26/Ocal-Browser
DefaultDirName={autopf}\Ocal
DefaultGroupName=Ocal
OutputDir=dist-inno
OutputBaseFilename=Ocal-6.02.00-beta-Setup
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
Source: "out\ocal-win32-x64\ocal.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "out\ocal-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "uninstaller\*"; DestDir: "{app}\uninstaller"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "pdf-icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Ocal Browser"; Filename: "{app}\ocal.exe"
Name: "{autodesktop}\Ocal Browser"; Filename: "{app}\ocal.exe"; Tasks: desktopicon

[Registry]
Root: HKCR; Subkey: ".pdf"; ValueType: string; ValueName: ""; ValueData: "Ocal.PDF"; Flags: uninsdeletevalue
Root: HKCR; Subkey: "Ocal.PDF"; ValueType: string; ValueName: ""; ValueData: "Ocal PDF Document"; Flags: uninsdeletekey
Root: HKCR; Subkey: "Ocal.PDF\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\pdf-icon.ico,0"; Flags: uninsdeletekey
Root: HKCR; Subkey: "Ocal.PDF\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\ocal.exe"" ""%1"""; Flags: uninsdeletekey
Root: HKCR; Subkey: "Ocal.PDF\shell\open"; ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Ocal Browser"; Flags: uninsdeletekey

[Run]
Filename: "{app}\ocal.exe"; Parameters: "--install"; Description: "Complete Premium Setup (Import Data, AI Sync)"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\ocal.exe"; Parameters: "--uninstall-survey"; Flags: runascurrentuser waituntilterminated
