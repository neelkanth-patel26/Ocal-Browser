; ============================================================
;  Ocal Browser - Inno Setup 6 Installer
;  Version  : 9.0.01  (Stable)
;  Builder  : Gaming Network Studio Media Group
;  Compiler : Inno Setup 6
; ============================================================

[Setup]
AppName=Ocal Browser
AppVersion=9.0.01
AppVerName=Ocal Browser 9.0.01
AppPublisher=Gaming Network Studio Media Group
AppPublisherURL=https://github.com/neelkanth-patel26/Ocal-Browser
AppSupportURL=https://github.com/neelkanth-patel26/Ocal-Browser/issues
AppUpdatesURL=https://github.com/neelkanth-patel26/Ocal-Browser/releases
AppCopyright=Copyright (C) 2026 Gaming Network Studio Media Group
DefaultDirName={autopf}\Ocal
DefaultGroupName=Ocal
OutputDir=dist-inno
OutputBaseFilename=Ocal-9.0.01-Setup
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
UninstallDisplayName=Ocal Browser 9.0.01
VersionInfoVersion=9.0.1.0
VersionInfoCompany=Gaming Network Studio Media Group
VersionInfoDescription=Ocal Browser Installer
VersionInfoProductName=Ocal Browser
VersionInfoProductVersion=9.0.01
WizardStyle=modern
WizardResizable=no
ShowLanguageDialog=no
CloseApplications=yes
CloseApplicationsFilter=Ocal Browser.exe

; ── Catalog / Component Selection ──────────────────────────
[Types]
Name: "full";    Description: "Full Installation (Recommended)"
Name: "compact"; Description: "Compact Installation (Core only)"
Name: "custom";  Description: "Custom Installation"; Flags: iscustom

[Components]
Name: "core";       Description: "Ocal Browser Core";                    Types: full compact custom; Flags: fixed
Name: "pdfviewer"; Description: "Built-in PDF Viewer (file association)"; Types: full custom


[Tasks]
Name: "desktopicon";   Description: "{cm:CreateDesktopIcon}";   GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunch";   Description: "Pin to Taskbar on first launch";     GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "setdefault";    Description: "Set Ocal as default browser";        GroupDescription: "Browser Defaults";     Flags: unchecked

[CustomMessages]
InstallingCore=Installing Ocal Browser core files...
InstallingPDF=Registering PDF viewer association...

LaunchAfterInstall=Launch Ocal Browser now
ReleaseNotes=View release notes for v9.0.01

; ── File Catalog ────────────────────────────────────────────
[InstallDelete]
Type: files; Name: "{app}\ocal.exe"

[Files]
; Core executable
Source: "dist-builder\win-unpacked\Ocal Browser.exe"; DestDir: "{app}"; Flags: ignoreversion; Components: core
; All supporting Electron runtime files
Source: "dist-builder\win-unpacked\*"; DestDir: "{app}"; Excludes: "Ocal Browser.exe,LICENSE.electron.txt,LICENSES.chromium.html"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: core

; Icons
Source: "pdf-icon.ico"; DestDir: "{app}"; Flags: ignoreversion; Components: pdfviewer
Source: "icon.ico";     DestDir: "{app}"; Flags: ignoreversion; Components: core

; ── Shortcuts ───────────────────────────────────────────────
[Icons]
Name: "{autoprograms}\Ocal Browser";          Filename: "{app}\Ocal Browser.exe"; IconFilename: "{app}\icon.ico"; AppUserModelID: "com.ocal.browser.v2"
Name: "{group}\Uninstall Ocal Browser"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Ocal Browser";    Filename: "{app}\Ocal Browser.exe"; Tasks: desktopicon; IconFilename: "{app}\icon.ico"; AppUserModelID: "com.ocal.browser.v2"

; ── Registry ────────────────────────────────────────────────
[Registry]
; PDF file association
Root: HKCR; Subkey: ".pdf";                          ValueType: string; ValueName: "";                ValueData: "Ocal.PDF";                                    Flags: uninsdeletevalue;  Components: pdfviewer
Root: HKCR; Subkey: "Ocal.PDF";                      ValueType: string; ValueName: "";                ValueData: "Ocal PDF Document";                           Flags: uninsdeletekey;    Components: pdfviewer
Root: HKCR; Subkey: "Ocal.PDF\DefaultIcon";          ValueType: string; ValueName: "";                ValueData: "{app}\pdf-icon.ico,0";                        Flags: uninsdeletekey;    Components: pdfviewer
Root: HKCR; Subkey: "Ocal.PDF\shell\open\command";   ValueType: string; ValueName: "";                ValueData: """{app}\Ocal Browser.exe"" ""%1""";                   Flags: uninsdeletekey;    Components: pdfviewer
Root: HKCR; Subkey: "Ocal.PDF\shell\open";           ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey;    Components: pdfviewer

; HTML & Web File Associations
Root: HKCR; Subkey: ".htm";                          ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKCR; Subkey: ".html";                         ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKCR; Subkey: ".shtml";                        ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKCR; Subkey: ".xht";                          ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKCR; Subkey: ".xhtml";                        ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKCR; Subkey: ".svg";                          ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKCR; Subkey: ".webp";                         ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue

Root: HKCR; Subkey: "OcalHTML";                      ValueType: string; ValueName: "";                ValueData: "Ocal HTML Document";                           Flags: uninsdeletekey
Root: HKCR; Subkey: "OcalHTML";                      ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Ocal HTML Document";                         Flags: uninsdeletekey
Root: HKCR; Subkey: "OcalHTML";                      ValueType: string; ValueName: "AppUserModelId";  ValueData: "com.ocal.browser.v2";                         Flags: uninsdeletekey
Root: HKCR; Subkey: "OcalHTML\DefaultIcon";          ValueType: string; ValueName: "";                ValueData: "{app}\icon.ico,0";                            Flags: uninsdeletekey
Root: HKCR; Subkey: "OcalHTML\shell\open\command";   ValueType: string; ValueName: "";                ValueData: """{app}\Ocal Browser.exe"" -- ""%1""";         Flags: uninsdeletekey
Root: HKCR; Subkey: "OcalHTML\shell\open";           ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey

; Protocols
Root: HKCR; Subkey: "ocal";                          ValueType: string; ValueName: "";                ValueData: "URL:Ocal Protocol";                           Flags: uninsdeletekey
Root: HKCR; Subkey: "ocal";                          ValueType: string; ValueName: "URL Protocol";    ValueData: "";                                            Flags: uninsdeletekey
Root: HKCR; Subkey: "ocal\shell\open\command";       ValueType: string; ValueName: "";                ValueData: """{app}\Ocal Browser.exe"" -- ""%1""";         Flags: uninsdeletekey

; Windows Default Programs registration
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser";                                        ValueType: string; ValueName: "";                      ValueData: "Ocal Browser";                                                                               Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\DefaultIcon";                            ValueType: string; ValueName: "";                      ValueData: "{app}\icon.ico,0";                                                                           Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\InstallInfo";                            ValueType: dword;  ValueName: "IconsVisible";          ValueData: "1";                                                                                          Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\shell\open\command";                   ValueType: string; ValueName: "";                      ValueData: """{app}\Ocal Browser.exe""";                                                                 Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationName";       ValueData: "Ocal Browser";                                                                               Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationIcon";       ValueData: "{app}\icon.ico,0";                                                                           Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationDescription";ValueData: "Ocal Browser is a modern, ultra-fast, and secure web browser powered by intelligent AI.";   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\StartMenu";                 ValueType: string; ValueName: "StartMenuInternet";     ValueData: "OcalBrowser";                                                                                Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".htm";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".html";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".shtml";                ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".xht";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".xhtml";                ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".svg";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".webp";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".pdf";                  ValueData: "Ocal.PDF";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "http";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "https";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "ftp";                   ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "ocal";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\RegisteredApplications";                                                       ValueType: string; ValueName: "OcalBrowser";          ValueData: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                                Flags: uninsdeletevalue

; App registration for Add/Remove Programs detail
Root: HKLM; Subkey: "Software\OcalBrowser"; ValueType: string; ValueName: "Version";      ValueData: "9.0.01";                                              Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\OcalBrowser"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}";                                                  Flags: uninsdeletekey

; ── Post-Install Run ────────────────────────────────────────
[Run]
Filename: "{app}\Ocal Browser.exe"; Parameters: "--install";      Description: "{cm:LaunchAfterInstall}";  Flags: nowait postinstall skipifsilent
Filename: "https://github.com/neelkanth-patel26/Ocal-Browser/releases/tag/v9.0.01"; Description: "{cm:ReleaseNotes}"; Flags: shellexec postinstall skipifsilent unchecked


