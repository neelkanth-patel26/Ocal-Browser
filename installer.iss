; ============================================================
;  Ocal Browser - Inno Setup 6 Installer
;  Version  : 7.7.00  (Stable)
;  Builder  : Gaming Network Studio Media Group
;  Compiler : Inno Setup 6
; ============================================================

[Setup]
AppName=Ocal Browser
AppVersion=7.7.00
AppVerName=Ocal Browser 7.7.00
AppPublisher=Gaming Network Studio Media Group
AppPublisherURL=https://github.com/neelkanth-patel26/Ocal-Browser
AppSupportURL=https://github.com/neelkanth-patel26/Ocal-Browser/issues
AppUpdatesURL=https://github.com/neelkanth-patel26/Ocal-Browser/releases
AppCopyright=Copyright (C) 2026 Gaming Network Studio Media Group
DefaultDirName={autopf}\Ocal
DefaultGroupName=Ocal
OutputDir=dist-inno
OutputBaseFilename=Ocal-7.7.00-Setup
SetupIconFile=icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
DiskSpanning=no
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
LicenseFile=license.txt
MinVersion=10.0.17763
UninstallDisplayIcon={app}\icon.ico
UninstallDisplayName=Ocal Browser 7.7.00
VersionInfoVersion=7.7.0.0
VersionInfoCompany=Gaming Network Studio Media Group
VersionInfoDescription=Ocal Browser Installer
VersionInfoProductName=Ocal Browser
VersionInfoProductVersion=7.7.00
WizardStyle=modern
WizardResizable=no
ShowLanguageDialog=no

; ── Catalog / Component Selection ──────────────────────────
[Types]
Name: "full";    Description: "Full Installation (Recommended)"
Name: "compact"; Description: "Compact Installation (Core only)"
Name: "custom";  Description: "Custom Installation"; Flags: iscustom

[Components]
Name: "core";       Description: "Ocal Browser Core";                    Types: full compact custom; Flags: fixed
Name: "pdfviewer"; Description: "Built-in PDF Viewer (file association)"; Types: full custom
Name: "uninstui";  Description: "Custom Uninstaller UI";                  Types: full custom

[Tasks]
Name: "desktopicon";   Description: "{cm:CreateDesktopIcon}";   GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunch";   Description: "Pin to Taskbar on first launch";     GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "setdefault";    Description: "Set Ocal as default browser";        GroupDescription: "Browser Defaults";     Flags: unchecked

[CustomMessages]
InstallingCore=Installing Ocal Browser core files...
InstallingPDF=Registering PDF viewer association...
InstallingUninstUI=Copying custom uninstaller UI...
LaunchAfterInstall=Launch Ocal Browser now
ReleaseNotes=View release notes for v7.7.00

; ── File Catalog ────────────────────────────────────────────
[Files]
; Core executable
Source: "dist-builder\win-unpacked\Ocal Browser.exe"; DestDir: "{app}"; DestName: "ocal.exe"; Flags: ignoreversion; Components: core
; All supporting Electron runtime files
Source: "dist-builder\win-unpacked\*"; DestDir: "{app}"; Excludes: "Ocal Browser.exe"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: core
; Custom uninstaller UI
Source: "uninstaller\*"; DestDir: "{app}\uninstaller"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: uninstui
; Icons
Source: "pdf-icon.ico"; DestDir: "{app}"; Flags: ignoreversion; Components: pdfviewer
Source: "icon.ico";     DestDir: "{app}"; Flags: ignoreversion; Components: core

; ── Shortcuts ───────────────────────────────────────────────
[Icons]
Name: "{group}\Ocal Browser";          Filename: "{app}\ocal.exe"; IconFilename: "{app}\icon.ico"; AppUserModelID: "com.ocal.browser"
Name: "{group}\Uninstall Ocal Browser"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Ocal Browser";    Filename: "{app}\ocal.exe"; Tasks: desktopicon; IconFilename: "{app}\icon.ico"; AppUserModelID: "com.ocal.browser"

; ── Registry ────────────────────────────────────────────────
[Registry]
; PDF file association
Root: HKCR; Subkey: ".pdf";                          ValueType: string; ValueName: "";                ValueData: "Ocal.PDF";                                    Flags: uninsdeletevalue;  Components: pdfviewer
Root: HKCR; Subkey: "Ocal.PDF";                      ValueType: string; ValueName: "";                ValueData: "Ocal PDF Document";                           Flags: uninsdeletekey;    Components: pdfviewer
Root: HKCR; Subkey: "Ocal.PDF\DefaultIcon";          ValueType: string; ValueName: "";                ValueData: "{app}\pdf-icon.ico,0";                        Flags: uninsdeletekey;    Components: pdfviewer
Root: HKCR; Subkey: "Ocal.PDF\shell\open\command";   ValueType: string; ValueName: "";                ValueData: """{app}\ocal.exe"" ""%1""";                   Flags: uninsdeletekey;    Components: pdfviewer
Root: HKCR; Subkey: "Ocal.PDF\shell\open";           ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey;    Components: pdfviewer
; App registration for Add/Remove Programs detail
Root: HKLM; Subkey: "Software\OcalBrowser"; ValueType: string; ValueName: "Version";      ValueData: "7.7.00";                                              Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\OcalBrowser"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}";                                                  Flags: uninsdeletekey

; ── Post-Install Run ────────────────────────────────────────
[Run]
Filename: "{app}\ocal.exe"; Parameters: "--install";      Description: "{cm:LaunchAfterInstall}";  Flags: nowait postinstall skipifsilent
Filename: "https://github.com/neelkanth-patel26/Ocal-Browser/releases/tag/v7.7.00"; Description: "{cm:ReleaseNotes}"; Flags: shellexec postinstall skipifsilent unchecked

[UninstallRun]
Filename: "{app}\ocal.exe"; Parameters: "--uninstall-survey"; Flags: runascurrentuser waituntilterminated
