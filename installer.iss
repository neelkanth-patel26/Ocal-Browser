[Setup]
AppName=Ocal Browser
AppVersion=3.4.40E-beta
AppPublisher=Gaming Network Studio Media Group
AppPublisherURL=https://github.com/neelkanth-patel26/Ocal-Browser
DefaultDirName={autopf}\Ocal
DefaultGroupName=Ocal
OutputDir=dist-inno
OutputBaseFilename=Ocal-3.4.40E-beta-Setup
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

[Icons]
Name: "{group}\Ocal Browser"; Filename: "{app}\ocal.exe"
Name: "{autodesktop}\Ocal Browser"; Filename: "{app}\ocal.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\ocal.exe"; Parameters: "--install"; Description: "Complete Premium Setup (Import Data, AI Sync)"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\ocal.exe"; Parameters: "--uninstall-survey"; Flags: runascurrentuser waituntilterminated
