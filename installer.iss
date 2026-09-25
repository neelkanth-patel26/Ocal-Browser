; ============================================================
;  Ocal Browser - Inno Setup 6 Installer
;  Version  : 9.5.00  (Stable)
;  Builder  : Gaming Network Studio Media Group
;  Compiler : Inno Setup 6
; ============================================================

[Setup]
AppId={{E482C748-0C05-4BE7-B15E-D2C2AEB8718E}
AppName=Ocal Browser
AppVersion=9.5.00
AppVerName=Ocal Browser 9.5.00
AppPublisher=Gaming Network Studio Media Group
AppPublisherURL=https://github.com/neelkanth-patel26/Ocal-Browser
AppSupportURL=https://github.com/neelkanth-patel26/Ocal-Browser/issues
AppUpdatesURL=https://github.com/neelkanth-patel26/Ocal-Browser/releases
AppCopyright=Copyright (C) 2026 Gaming Network Studio Media Group
DefaultDirName={autopf}\Ocal
DefaultGroupName=Ocal
OutputDir=dist-inno
OutputBaseFilename=Ocal-9.5.00-Setup
SetupIconFile=icon.ico
Compression=lzma2/ultra64
LZMAUseSeparateProcess=yes
SolidCompression=yes
DiskSpanning=no
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=commandline
ArchitecturesInstallIn64BitMode=x64compatible
LicenseFile=license.txt
MinVersion=10.0.17763
UninstallDisplayIcon={app}\icon.ico
UninstallDisplayName=Ocal Browser
VersionInfoVersion=9.5.0.0
VersionInfoCompany=Gaming Network Studio Media Group
VersionInfoDescription=Ocal Browser Installer
VersionInfoProductName=Ocal Browser
VersionInfoProductVersion=9.5.00
WizardStyle=modern
ShowLanguageDialog=no
CloseApplications=no
RestartIfNeededByRun=no
UsedUserAreasWarning=no

; ── Detailed Catalog / Component Selection ──────────────────────────
[Types]
Name: "full";    Description: "Full Installation (Recommended - Complete Feature Set)"
Name: "compact"; Description: "Compact Installation (Core Browser Runtime only)"
Name: "custom";  Description: "Custom Installation (Choose individual features)"; Flags: iscustom

[Components]
Name: "core";        Description: "Ocal Browser Core Engine (High-Performance Web, AI Studio & Multitasking Runtime)"; Types: full compact custom; Flags: fixed
Name: "ocalconnect"; Description: "Ocal Connect Local Mobile Sync Bridge (Zero-cloud LAN peer-to-peer sync)";           Types: full custom
Name: "pdfviewer";   Description: "Built-in Native PDF Viewer (Document file association for .pdf files)";             Types: full custom
Name: "webshield";   Description: "Ocal Shield Protection & Anti-Tracker Filters";                                     Types: full custom
Name: "cwsbridge";   Description: "Chrome Web Store Universal Extension Bridge";                                       Types: full custom

[Tasks]
Name: "desktopicon";   Description: "{cm:CreateDesktopIcon}";               GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunch";   Description: "Pin to Taskbar on first launch";       GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "setdefault";    Description: "Set Ocal as default browser";          GroupDescription: "Browser Defaults";     Flags: unchecked

[CustomMessages]
InstallingCore=Installing Ocal Browser core engine and components...
InstallingPDF=Registering native PDF document viewer...
InstallingSync=Configuring Ocal Connect local sync bridge...

LaunchAfterInstall=Launch Ocal Browser now
ReleaseNotes=View release notes for v9.5.00

; ── File Catalog ────────────────────────────────────────────
[InstallDelete]
Type: files; Name: "{app}\ocal.exe"

[Files]
; Core executable
Source: "dist-builder\win-unpacked\Ocal Browser.exe"; DestDir: "{app}"; Flags: ignoreversion; Components: core
; All supporting Electron runtime files
Source: "dist-builder\win-unpacked\*"; DestDir: "{app}"; Excludes: "Ocal Browser.exe,LICENSE.electron.txt,LICENSES.chromium.html"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: core

; Icons & Graphics
Source: "pdf-icon.ico"; DestDir: "{app}"; Flags: ignoreversion; Components: pdfviewer
Source: "icon.ico";     DestDir: "{app}"; Flags: ignoreversion; Components: core
Source: "build\installer_logo.bmp"; DestDir: "{app}"; Flags: ignoreversion uninsneveruninstall
Source: "build\installer_logo.bmp"; Flags: dontcopy
Source: "license.txt"; Flags: dontcopy

; ── Shortcuts ───────────────────────────────────────────────
[Icons]
Name: "{autoprograms}\Ocal Browser";          Filename: "{app}\Ocal Browser.exe"; IconFilename: "{app}\icon.ico"; AppUserModelID: "com.ocal.browser.v2"
Name: "{group}\Uninstall Ocal Browser"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Ocal Browser";    Filename: "{app}\Ocal Browser.exe"; Tasks: desktopicon; IconFilename: "{app}\icon.ico"; AppUserModelID: "com.ocal.browser.v2"

; ── Registry ────────────────────────────────────────────────
[Registry]
; PDF file association
Root: HKA; Subkey: "Software\Classes\.pdf";                          ValueType: string; ValueName: "";                ValueData: "Ocal.PDF";                                    Flags: uninsdeletevalue;  Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF";                      ValueType: string; ValueName: "";                ValueData: "Ocal PDF Document";                           Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF";                      ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Ocal PDF Document";                         Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF";                      ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF";                      ValueType: string; ValueName: "AppUserModelId";  ValueData: "com.ocal.browser.v2";                         Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF\DefaultIcon";          ValueType: string; ValueName: "";                ValueData: "{app}\pdf-icon.ico,0";                        Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF\Application";          ValueType: string; ValueName: "ApplicationName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF\Application";          ValueType: string; ValueName: "ApplicationIcon"; ValueData: "{app}\icon.ico,0";                            Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF\Application";          ValueType: string; ValueName: "ApplicationCompany"; ValueData: "Gaming Network Studio Media Group";       Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF\Application";          ValueType: string; ValueName: "ApplicationDescription"; ValueData: "Ocal Browser PDF Document";            Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF\Application";          ValueType: string; ValueName: "AppUserModelId";  ValueData: "com.ocal.browser.v2";                         Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF\shell\open";           ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey;    Components: pdfviewer
Root: HKA; Subkey: "Software\Classes\Ocal.PDF\shell\open\command";   ValueType: string; ValueName: "";                ValueData: """{app}\Ocal Browser.exe"" ""%1""";           Flags: uninsdeletekey;    Components: pdfviewer

; HTML & Web File Associations
Root: HKA; Subkey: "Software\Classes\.htm";                          ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.html";                         ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.shtml";                        ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.xht";                          ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.xhtml";                        ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.svg";                          ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue
Root: HKA; Subkey: "Software\Classes\.webp";                         ValueType: string; ValueName: "";                ValueData: "OcalHTML";                                    Flags: uninsdeletevalue

Root: HKA; Subkey: "Software\Classes\OcalHTML";                      ValueType: string; ValueName: "";                ValueData: "Ocal HTML Document";                           Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML";                      ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Ocal HTML Document";                         Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML";                      ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML";                      ValueType: string; ValueName: "AppUserModelId";  ValueData: "com.ocal.browser.v2";                         Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML\DefaultIcon";          ValueType: string; ValueName: "";                ValueData: "{app}\icon.ico,0";                            Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML\Application";          ValueType: string; ValueName: "ApplicationName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML\Application";          ValueType: string; ValueName: "ApplicationIcon"; ValueData: "{app}\icon.ico,0";                            Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML\Application";          ValueType: string; ValueName: "ApplicationCompany"; ValueData: "Gaming Network Studio Media Group";       Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML\Application";          ValueType: string; ValueName: "AppUserModelId";  ValueData: "com.ocal.browser.v2";                         Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML\shell\open";           ValueType: string; ValueName: "FriendlyAppName"; ValueData: "Ocal Browser";                                Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\OcalHTML\shell\open\command";   ValueType: string; ValueName: "";                ValueData: """{app}\Ocal Browser.exe"" -- ""%1""";         Flags: uninsdeletekey

; Protocols
Root: HKA; Subkey: "Software\Classes\ocal";                          ValueType: string; ValueName: "";                ValueData: "URL:Ocal Protocol";                           Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\ocal";                          ValueType: string; ValueName: "URL Protocol";    ValueData: "";                                            Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\ocal\shell\open\command";       ValueType: string; ValueName: "";                ValueData: """{app}\Ocal Browser.exe"" -- ""%1""";         Flags: uninsdeletekey

; Applications registration
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe";                          ValueType: string; ValueName: "";                      ValueData: "Ocal Browser";                                Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe";                          ValueType: string; ValueName: "FriendlyAppName";        ValueData: "Ocal Browser";                                Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe";                          ValueType: string; ValueName: "ApplicationCompany";      ValueData: "Gaming Network Studio Media Group";           Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe";                          ValueType: string; ValueName: "SupportedProtocols";      ValueData: "http;https;ftp;ocal";                         Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe\DefaultIcon";              ValueType: string; ValueName: "";                      ValueData: "{app}\icon.ico,0";                            Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe\SupportedTypes";          ValueType: string; ValueName: ".pdf";                  ValueData: "";                                            Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe\SupportedTypes";          ValueType: string; ValueName: ".htm";                  ValueData: "";                                            Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe\SupportedTypes";          ValueType: string; ValueName: ".html";                 ValueData: "";                                            Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe\shell\open";               ValueType: string; ValueName: "FriendlyAppName";        ValueData: "Ocal Browser";                                Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\Applications\Ocal Browser.exe\shell\open\command";       ValueType: string; ValueName: "";                      ValueData: """{app}\Ocal Browser.exe"" -- ""%1""";         Flags: uninsdeletekey

; AppUserModelId registration
Root: HKA; Subkey: "Software\Classes\AppUserModelId\com.ocal.browser.v2";                     ValueType: string; ValueName: "DisplayName";            ValueData: "Ocal Browser";                                Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\AppUserModelId\com.ocal.browser.v2";                     ValueType: string; ValueName: "IconUri";                ValueData: "{app}\icon.ico";                              Flags: uninsdeletekey
Root: HKA; Subkey: "Software\Classes\AppUserModelId\com.ocal.browser.v2";                     ValueType: dword;  ValueName: "ShowInSettings";         ValueData: "1";                                           Flags: uninsdeletekey

; Windows Default Programs registration (HKLM when elevated + HKCU for complete Windows Settings visibility)
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser";                                        ValueType: string; ValueName: "";                      ValueData: "Ocal Browser";                                                                               Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\DefaultIcon";                            ValueType: string; ValueName: "";                      ValueData: "{app}\icon.ico,0";                                                                           Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\InstallInfo";                            ValueType: dword;  ValueName: "IconsVisible";          ValueData: "1";                                                                                          Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\shell\open\command";                   ValueType: string; ValueName: "";                      ValueData: """{app}\Ocal Browser.exe""";                                                                 Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationName";       ValueData: "Ocal Browser";                                                                               Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationIcon";       ValueData: "{app}\icon.ico,0";                                                                           Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationDescription";ValueData: "Ocal Browser is a modern, ultra-fast, and secure web browser powered by intelligent AI.";   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\StartMenu";                 ValueType: string; ValueName: "StartMenuInternet";     ValueData: "OcalBrowser";                                                                                Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".htm";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".html";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".shtml";                ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".xht";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".xhtml";                ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".svg";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".webp";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".pdf";                  ValueData: "Ocal.PDF";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "http";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "https";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "ftp";                   ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "ocal";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey;   Check: IsAdminInstallMode
Root: HKLM; Subkey: "Software\RegisteredApplications";                                                       ValueType: string; ValueName: "OcalBrowser";          ValueData: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                                Flags: uninsdeletevalue; Check: IsAdminInstallMode

Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser";                                        ValueType: string; ValueName: "";                      ValueData: "Ocal Browser";                                                                               Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\DefaultIcon";                            ValueType: string; ValueName: "";                      ValueData: "{app}\icon.ico,0";                                                                           Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\InstallInfo";                            ValueType: dword;  ValueName: "IconsVisible";          ValueData: "1";                                                                                          Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\shell\open\command";                   ValueType: string; ValueName: "";                      ValueData: """{app}\Ocal Browser.exe""";                                                                 Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationName";       ValueData: "Ocal Browser";                                                                               Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationIcon";       ValueData: "{app}\icon.ico,0";                                                                           Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                           ValueType: string; ValueName: "ApplicationDescription";ValueData: "Ocal Browser is a modern, ultra-fast, and secure web browser powered by intelligent AI.";   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\StartMenu";                 ValueType: string; ValueName: "StartMenuInternet";     ValueData: "OcalBrowser";                                                                                Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".htm";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".html";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".shtml";                ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".xht";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".xhtml";                ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".svg";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".webp";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations";         ValueType: string; ValueName: ".pdf";                  ValueData: "Ocal.PDF";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "http";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "https";                 ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "ftp";                   ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\URLAssociations";          ValueType: string; ValueName: "ocal";                  ValueData: "OcalHTML";                                                                                   Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\RegisteredApplications";                                                       ValueType: string; ValueName: "OcalBrowser";          ValueData: "Software\Clients\StartMenuInternet\OcalBrowser\Capabilities";                                Flags: uninsdeletevalue

; App registration for Add/Remove Programs detail
Root: HKA; Subkey: "Software\OcalBrowser"; ValueType: string; ValueName: "Version";      ValueData: "9.5.00"; Flags: uninsdeletekey
Root: HKA; Subkey: "Software\OcalBrowser"; ValueType: string; ValueName: "InstallPath";  ValueData: "{app}";  Flags: uninsdeletekey

; ── Post-Install Run ────────────────────────────────────────
[Run]
Filename: "{app}\Ocal Browser.exe"; Parameters: "--install";      Description: "{cm:LaunchAfterInstall}";  Flags: nowait postinstall skipifsilent
Filename: "https://github.com/neelkanth-patel26/Ocal-Browser/releases/tag/v9.5.00"; Description: "{cm:ReleaseNotes}"; Flags: shellexec postinstall skipifsilent unchecked

; ── Complete Cleanup on Uninstall ───────────────────────────
[UninstallDelete]
Type: filesandordirs; Name: "{userappdata}\ocal"
Type: filesandordirs; Name: "{userappdata}\Ocal Browser"
Type: filesandordirs; Name: "{localappdata}\ocal"
Type: filesandordirs; Name: "{localappdata}\Ocal Browser"
Type: filesandordirs; Name: "{localappdata}\Programs\Ocal"
Type: files;          Name: "{autodesktop}\Ocal Browser.lnk"
Type: files;          Name: "{autodesktop}\Ocal.lnk"
Type: files;          Name: "{autoprograms}\Ocal Browser.lnk"
Type: files;          Name: "{autoprograms}\Ocal.lnk"
Type: filesandordirs; Name: "{app}"

[Code]
function DwmSetWindowAttribute(hWnd: HWND; dwAttribute: DWORD; var pvAttribute: DWORD; cbAttribute: DWORD): HRESULT; external 'DwmSetWindowAttribute@dwmapi.dll stdcall delayload';

procedure SHChangeNotify(wEventId: LongInt; uFlags: Cardinal; dwItem1: Cardinal; dwItem2: Cardinal);
external 'SHChangeNotify@shell32.dll stdcall';

const
  SHCNE_ASSOCCHANGED = $08000000;
  SHCNF_FLUSH        = $1000;

  DWMWA_WINDOW_CORNER_PREFERENCE = 33;
  DWMWCP_ROUND                   = 2;
  DWMWA_CAPTION_COLOR            = 35;
  DWMWA_TEXT_COLOR               = 36;

  COLOR_TEXT    = $2A170F; // #0F172A (Deep slate typography)
  COLOR_MUTED   = $8B7464; // #64748B (Slate muted)
  COLOR_HINT    = $B8A394; // #94A3B8 (Light slate hint)
  COLOR_ACCENT  = $699605; // #059669 (Ocal Emerald Green)
  COLOR_BOX_BG  = $FCFAF8; // #F8FAFC (Soft modern panel surface)
  COLOR_HEADER  = $695547; // #475569 (Label text)

var
  PnlMain: TPanel;
  PnlWelcome: TPanel;
  PnlOptionsBorder: TPanel;
  PnlOptions: TPanel;
  PnlInstalling: TPanel;
  PnlFinished: TPanel;
  PnlTerms: TPanel;

  ImgLogo: TBitmapImage;
  LblBrandTitle: TLabel;
  LblBrandSub: TLabel;
  LblVersion: TLabel;
  BtnInstall: TNewButton;
  LblLegal: TLabel;
  LblTermsLink: TLabel;
  BtnToggleOptions: TLabel;

  LblTermsTitle: TLabel;
  LblTermsSub: TLabel;
  MemoTerms: TNewMemo;
  BtnBackFromTerms: TNewButton;
  BtnAcceptFromTerms: TNewButton;
  BtnOpenLicenseExternal: TLabel;
  BtnViewTermsTopLink: TLabel;
  
  LblPathTitle: TLabel;
  EditPath: TNewEdit;
  BtnBrowse: TNewButton;
  Sep1: TBevel;
  ChkDefaultBrowser: TNewCheckBox;
  LblDefBrowserSub: TLabel;
  ChkDesktopIcon: TNewCheckBox;
  LblDesktopSub: TLabel;
  ChkPDFViewer: TNewCheckBox;
  LblPDFSub: TLabel;
  ChkAllUsers: TNewCheckBox;
  LblAllUsersSub: TLabel;
  
  ImgInstallLogo: TBitmapImage;
  LblInstallTitle: TLabel;
  LblInstallStatus: TLabel;
  LblProgressPct: TLabel;
  PnlProgressTrack: TPanel;
  PnlProgressFill: TPanel;
  
  ImgFinishLogo: TBitmapImage;
  LblFinishedTitle: TLabel;
  LblFinishedSub: TLabel;
  BtnFinishLaunch: TNewButton;

  OptionsVisible: Boolean;

procedure ApplyModernTitleBar(FormHandle: HWND);
var
  CaptionColor, TextColor, CornerPref: DWORD;
begin
  CaptionColor := $00FFFFFF; // Seamless pure white titlebar
  DwmSetWindowAttribute(FormHandle, DWMWA_CAPTION_COLOR, CaptionColor, 4);

  TextColor := $002A170F; // Dark charcoal text
  DwmSetWindowAttribute(FormHandle, DWMWA_TEXT_COLOR, TextColor, 4);

  CornerPref := DWMWCP_ROUND;
  DwmSetWindowAttribute(FormHandle, DWMWA_WINDOW_CORNER_PREFERENCE, CornerPref, 4);
end;

procedure ChkAllUsersClick(Sender: TObject);
begin
  if ChkAllUsers.Checked then
    EditPath.Text := ExpandConstant('{commonpf}\Ocal')
  else
    EditPath.Text := ExpandConstant('{autopf}\Ocal');
end;

procedure BtnToggleOptionsClick(Sender: TObject);
begin
  OptionsVisible := not OptionsVisible;
  PnlOptionsBorder.Visible := OptionsVisible;
  if OptionsVisible then
  begin
    BtnToggleOptions.Caption := 'Hide options ▴';
    WizardForm.ClientHeight := ScaleY(425);
    PnlMain.Height := WizardForm.ClientHeight;
    PnlWelcome.Height := WizardForm.ClientHeight;
  end
  else
  begin
    BtnToggleOptions.Caption := 'Installation options ▾';
    WizardForm.ClientHeight := ScaleY(235);
    PnlMain.Height := WizardForm.ClientHeight;
    PnlWelcome.Height := WizardForm.ClientHeight;
  end;
end;

procedure BtnBrowseClick(Sender: TObject);
var
  NewDir: string;
begin
  NewDir := EditPath.Text;
  if BrowseForFolder('Select Installation Folder', NewDir, True) then
  begin
    EditPath.Text := NewDir;
  end;
end;

procedure BtnViewTermsClick(Sender: TObject);
var
  LicenseFile: string;
  LinesArr: TArrayOfString;
  I: Integer;
begin
  PnlWelcome.Hide;
  PnlTerms.Show;
  WizardForm.ClientHeight := ScaleY(440);
  PnlMain.Height := WizardForm.ClientHeight;
  PnlTerms.Height := WizardForm.ClientHeight;

  if MemoTerms.Lines.Count = 0 then
  begin
    LicenseFile := ExpandConstant('{tmp}\license.txt');
    if not FileExists(LicenseFile) then
      ExtractTemporaryFile('license.txt');
    if FileExists(LicenseFile) and LoadStringsFromFile(LicenseFile, LinesArr) then
    begin
      for I := 0 to GetArrayLength(LinesArr) - 1 do
        MemoTerms.Lines.Add(LinesArr[I]);
    end
    else
      MemoTerms.Lines.Add('Unable to load license terms. Please refer to license.txt.');
  end;
end;

procedure BtnBackFromTermsClick(Sender: TObject);
begin
  PnlTerms.Hide;
  PnlWelcome.Show;
  if OptionsVisible then
    WizardForm.ClientHeight := ScaleY(425)
  else
    WizardForm.ClientHeight := ScaleY(235);
  PnlMain.Height := WizardForm.ClientHeight;
  PnlWelcome.Height := WizardForm.ClientHeight;
end;

procedure BtnOpenLicenseExternalClick(Sender: TObject);
var
  LicenseFile: string;
  ErrorCode: Integer;
begin
  LicenseFile := ExpandConstant('{tmp}\license.txt');
  if not FileExists(LicenseFile) then
    ExtractTemporaryFile('license.txt');
  ShellExec('open', LicenseFile, '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
end;

procedure BtnInstallClick(Sender: TObject);
var
  Comps, Tasks: string;
begin
  WizardForm.DirEdit.Text := EditPath.Text;

  // Sync components
  Comps := 'core';
  if ChkPDFViewer.Checked then
    Comps := Comps + ',pdfviewer';
  WizardSelectComponents(Comps);

  // Sync tasks
  Tasks := '';
  if ChkDesktopIcon.Checked then
    Tasks := Tasks + 'desktopicon';
  if ChkDefaultBrowser.Checked then
  begin
    if Tasks <> '' then Tasks := Tasks + ',';
    Tasks := Tasks + 'setdefault';
  end;
  WizardSelectTasks(Tasks);

  WizardForm.NextButton.OnClick(WizardForm.NextButton);
end;

procedure BtnFinishLaunchClick(Sender: TObject);
begin
  WizardForm.NextButton.OnClick(WizardForm.NextButton);
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  if (PageID = wpLicense) or 
     (PageID = wpSelectDir) or 
     (PageID = wpSelectComponents) or 
     (PageID = wpSelectProgramGroup) or 
     (PageID = wpSelectTasks) or 
     (PageID = wpReady) then
  begin
    Result := True;
  end
  else
    Result := False;
end;

procedure CurInstallProgressChanged(CurProgress, MaxProgress: Integer);
var
  Pct: Integer;
  NewW: Integer;
begin
  if MaxProgress > 0 then
  begin
    Pct := (CurProgress * 100) div MaxProgress;
    NewW := (PnlProgressTrack.Width * CurProgress) div MaxProgress;
    if NewW > PnlProgressTrack.Width then
      NewW := PnlProgressTrack.Width;
    PnlProgressFill.Width := NewW;
    LblInstallStatus.Caption := 'Extracting browser files...';
    LblProgressPct.Caption := Format('%d%%', [Pct]);
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpWelcome then
  begin
    PnlWelcome.Show;
    PnlInstalling.Hide;
    PnlFinished.Hide;
  end
  else if CurPageID = wpInstalling then
  begin
    PnlWelcome.Hide;
    PnlOptionsBorder.Hide;
    PnlInstalling.Show;
    PnlFinished.Hide;
    WizardForm.ClientHeight := ScaleY(140);
    PnlMain.Height := WizardForm.ClientHeight;
    PnlInstalling.Height := WizardForm.ClientHeight;
  end
  else if CurPageID = wpFinished then
  begin
    PnlWelcome.Hide;
    PnlOptionsBorder.Hide;
    PnlInstalling.Hide;
    PnlFinished.Show;
    WizardForm.ClientHeight := ScaleY(148);
    PnlMain.Height := WizardForm.ClientHeight;
    PnlFinished.Height := WizardForm.ClientHeight;
  end;
end;

procedure InitializeWizard();
var
  LogoPath: string;
begin
  OptionsVisible := False;

  WizardForm.Caption := 'Ocal Browser Setup';
  WizardForm.ClientWidth := ScaleX(520);
  WizardForm.ClientHeight := ScaleY(235);
  WizardForm.Position := poScreenCenter;
  WizardForm.Color := clWhite;

  // Apply seamless white titlebar styling matching light theme
  ApplyModernTitleBar(WizardForm.Handle);

  // Hide default wizard chrome
  WizardForm.OuterNotebook.Hide;
  WizardForm.InnerNotebook.Hide;
  WizardForm.Bevel.Hide;
  WizardForm.BeveledLabel.Hide;
  WizardForm.BackButton.Hide;
  WizardForm.NextButton.Hide;
  WizardForm.CancelButton.Hide;

  // Outer Canvas Panel (Pure Crisp White)
  PnlMain := TPanel.Create(WizardForm);
  PnlMain.Parent := WizardForm;
  PnlMain.SetBounds(0, 0, WizardForm.ClientWidth, WizardForm.ClientHeight);
  PnlMain.Color := clWhite;
  PnlMain.BevelOuter := bvNone;

  // 1. Welcome Screen
  PnlWelcome := TPanel.Create(WizardForm);
  PnlWelcome.Parent := PnlMain;
  PnlWelcome.SetBounds(0, 0, PnlMain.Width, PnlMain.Height);
  PnlWelcome.Color := clWhite;
  PnlWelcome.BevelOuter := bvNone;

  ExtractTemporaryFile('installer_logo.bmp');
  LogoPath := ExpandConstant('{tmp}\installer_logo.bmp');

  if FileExists(LogoPath) then
  begin
    ImgLogo := TBitmapImage.Create(WizardForm);
    ImgLogo.Parent := PnlWelcome;
    ImgLogo.SetBounds(ScaleX(24), ScaleY(18), ScaleX(64), ScaleY(64));
    ImgLogo.Stretch := True;
    ImgLogo.Bitmap.LoadFromFile(LogoPath);
  end;

  LblBrandTitle := TLabel.Create(WizardForm);
  LblBrandTitle.Parent := PnlWelcome;
  LblBrandTitle.Caption := 'Ocal Browser';
  LblBrandTitle.Font.Name := 'Segoe UI';
  LblBrandTitle.Font.Size := 20;
  LblBrandTitle.Font.Color := COLOR_TEXT;
  LblBrandTitle.Font.Style := [fsBold];
  LblBrandTitle.Left := ScaleX(102);
  LblBrandTitle.Top := ScaleY(16);

  LblBrandSub := TLabel.Create(WizardForm);
  LblBrandSub.Parent := PnlWelcome;
  LblBrandSub.Caption := 'Fast, Secure, and Agentic Browser';
  LblBrandSub.Font.Name := 'Segoe UI';
  LblBrandSub.Font.Size := 9;
  LblBrandSub.Font.Color := COLOR_MUTED;
  LblBrandSub.Left := ScaleX(104);
  LblBrandSub.Top := ScaleY(46);

  LblVersion := TLabel.Create(WizardForm);
  LblVersion.Parent := PnlWelcome;
  LblVersion.Caption := 'v9.5.00 • Stable Release';
  LblVersion.Font.Name := 'Segoe UI';
  LblVersion.Font.Size := 8;
  LblVersion.Font.Color := COLOR_ACCENT;
  LblVersion.Font.Style := [fsBold];
  LblVersion.Left := ScaleX(104);
  LblVersion.Top := ScaleY(66);

  // Prominent "Accept and Install" Button
  BtnInstall := TNewButton.Create(WizardForm);
  BtnInstall.Parent := PnlWelcome;
  BtnInstall.Caption := 'Accept and Install';
  BtnInstall.Font.Name := 'Segoe UI';
  BtnInstall.Font.Size := 10;
  BtnInstall.Font.Style := [fsBold];
  BtnInstall.SetBounds(ScaleX(102), ScaleY(98), ScaleX(250), ScaleY(40));
  BtnInstall.OnClick := @BtnInstallClick;

  // Legal Subtitle with clickable Terms of Service link
  LblLegal := TLabel.Create(WizardForm);
  LblLegal.Parent := PnlWelcome;
  LblLegal.Caption := 'By clicking "Accept and Install", you agree to the';
  LblLegal.Font.Name := 'Segoe UI';
  LblLegal.Font.Size := 8;
  LblLegal.Font.Color := COLOR_HINT;
  LblLegal.Left := ScaleX(104);
  LblLegal.Top := ScaleY(146);

  LblTermsLink := TLabel.Create(WizardForm);
  LblTermsLink.Parent := PnlWelcome;
  LblTermsLink.Caption := 'Terms of Service';
  LblTermsLink.Font.Name := 'Segoe UI';
  LblTermsLink.Font.Size := 8;
  LblTermsLink.Font.Color := COLOR_ACCENT;
  LblTermsLink.Font.Style := [fsBold, fsUnderline];
  LblTermsLink.Cursor := crHand;
  LblTermsLink.Left := ScaleX(312);
  LblTermsLink.Top := ScaleY(146);
  LblTermsLink.OnClick := @BtnViewTermsClick;

  // Options Toggle Link
  BtnToggleOptions := TLabel.Create(WizardForm);
  BtnToggleOptions.Parent := PnlWelcome;
  BtnToggleOptions.Caption := 'Installation options ▾';
  BtnToggleOptions.Font.Name := 'Segoe UI';
  BtnToggleOptions.Font.Size := 8;
  BtnToggleOptions.Font.Color := COLOR_ACCENT;
  BtnToggleOptions.Font.Style := [fsBold];
  BtnToggleOptions.Cursor := crHand;
  BtnToggleOptions.Left := ScaleX(104);
  BtnToggleOptions.Top := ScaleY(170);
  BtnToggleOptions.OnClick := @BtnToggleOptionsClick;

  BtnViewTermsTopLink := TLabel.Create(WizardForm);
  BtnViewTermsTopLink.Parent := PnlWelcome;
  BtnViewTermsTopLink.Caption := '•   View License & Terms ↗';
  BtnViewTermsTopLink.Font.Name := 'Segoe UI';
  BtnViewTermsTopLink.Font.Size := 8;
  BtnViewTermsTopLink.Font.Color := COLOR_ACCENT;
  BtnViewTermsTopLink.Font.Style := [fsBold];
  BtnViewTermsTopLink.Cursor := crHand;
  BtnViewTermsTopLink.Left := ScaleX(224);
  BtnViewTermsTopLink.Top := ScaleY(170);
  BtnViewTermsTopLink.OnClick := @BtnViewTermsClick;

  // Options Panel Container (Card with 1px border #E2E8F0)
  PnlOptionsBorder := TPanel.Create(WizardForm);
  PnlOptionsBorder.Parent := PnlWelcome;
  PnlOptionsBorder.SetBounds(ScaleX(20), ScaleY(202), ScaleX(480), ScaleY(194));
  PnlOptionsBorder.Color := $E2E8F0; // Soft modern border
  PnlOptionsBorder.BevelOuter := bvNone;
  PnlOptionsBorder.Visible := False;

  PnlOptions := TPanel.Create(WizardForm);
  PnlOptions.Parent := PnlOptionsBorder;
  PnlOptions.SetBounds(ScaleX(1), ScaleY(1), PnlOptionsBorder.Width - ScaleX(2), PnlOptionsBorder.Height - ScaleY(2));
  PnlOptions.Color := COLOR_BOX_BG; // #F8FAFC
  PnlOptions.BevelOuter := bvNone;

  // Section 1: Folder Selection
  LblPathTitle := TLabel.Create(WizardForm);
  LblPathTitle.Parent := PnlOptions;
  LblPathTitle.Caption := 'INSTALLATION LOCATION';
  LblPathTitle.Font.Name := 'Segoe UI';
  LblPathTitle.Font.Color := COLOR_HEADER;
  LblPathTitle.Font.Size := 8;
  LblPathTitle.Font.Style := [fsBold];
  LblPathTitle.Left := ScaleX(14);
  LblPathTitle.Top := ScaleY(12);

  EditPath := TNewEdit.Create(WizardForm);
  EditPath.Parent := PnlOptions;
  EditPath.Text := ExpandConstant('{autopf}\Ocal');
  EditPath.Font.Name := 'Segoe UI';
  EditPath.Font.Size := 9;
  EditPath.SetBounds(ScaleX(14), ScaleY(30), ScaleX(354), ScaleY(26));

  BtnBrowse := TNewButton.Create(WizardForm);
  BtnBrowse.Parent := PnlOptions;
  BtnBrowse.Caption := 'Browse...';
  BtnBrowse.Font.Name := 'Segoe UI';
  BtnBrowse.Font.Size := 8;
  BtnBrowse.Font.Style := [fsBold];
  BtnBrowse.SetBounds(ScaleX(378), ScaleY(29), ScaleX(86), ScaleY(28));
  BtnBrowse.OnClick := @BtnBrowseClick;

  // Divider Line
  Sep1 := TBevel.Create(WizardForm);
  Sep1.Parent := PnlOptions;
  Sep1.Shape := bsTopLine;
  Sep1.SetBounds(ScaleX(14), ScaleY(68), PnlOptions.Width - ScaleX(28), ScaleY(2));

  // Option 1: Default Browser
  ChkDefaultBrowser := TNewCheckBox.Create(WizardForm);
  ChkDefaultBrowser.Parent := PnlOptions;
  ChkDefaultBrowser.Caption := 'Set as default browser';
  ChkDefaultBrowser.Checked := True;
  ChkDefaultBrowser.Font.Name := 'Segoe UI';
  ChkDefaultBrowser.Font.Size := 9;
  ChkDefaultBrowser.Font.Style := [fsBold];
  ChkDefaultBrowser.Left := ScaleX(14);
  ChkDefaultBrowser.Top := ScaleY(78);
  ChkDefaultBrowser.Width := ScaleX(210);

  LblDefBrowserSub := TLabel.Create(WizardForm);
  LblDefBrowserSub.Parent := PnlOptions;
  LblDefBrowserSub.Caption := 'Open web links & HTML with Ocal';
  LblDefBrowserSub.Font.Name := 'Segoe UI';
  LblDefBrowserSub.Font.Size := 8;
  LblDefBrowserSub.Font.Color := COLOR_HINT;
  LblDefBrowserSub.Left := ScaleX(34);
  LblDefBrowserSub.Top := ScaleY(98);

  // Option 2: Desktop Shortcut
  ChkDesktopIcon := TNewCheckBox.Create(WizardForm);
  ChkDesktopIcon.Parent := PnlOptions;
  ChkDesktopIcon.Caption := 'Create desktop shortcut';
  ChkDesktopIcon.Checked := True;
  ChkDesktopIcon.Font.Name := 'Segoe UI';
  ChkDesktopIcon.Font.Size := 9;
  ChkDesktopIcon.Font.Style := [fsBold];
  ChkDesktopIcon.Left := ScaleX(244);
  ChkDesktopIcon.Top := ScaleY(78);
  ChkDesktopIcon.Width := ScaleX(210);

  LblDesktopSub := TLabel.Create(WizardForm);
  LblDesktopSub.Parent := PnlOptions;
  LblDesktopSub.Caption := 'Quick access from your desktop';
  LblDesktopSub.Font.Name := 'Segoe UI';
  LblDesktopSub.Font.Size := 8;
  LblDesktopSub.Font.Color := COLOR_HINT;
  LblDesktopSub.Left := ScaleX(264);
  LblDesktopSub.Top := ScaleY(98);

  // Option 3: PDF Viewer
  ChkPDFViewer := TNewCheckBox.Create(WizardForm);
  ChkPDFViewer.Parent := PnlOptions;
  ChkPDFViewer.Caption := 'Enable built-in PDF viewer';
  ChkPDFViewer.Checked := True;
  ChkPDFViewer.Font.Name := 'Segoe UI';
  ChkPDFViewer.Font.Size := 9;
  ChkPDFViewer.Font.Style := [fsBold];
  ChkPDFViewer.Left := ScaleX(14);
  ChkPDFViewer.Top := ScaleY(126);
  ChkPDFViewer.Width := ScaleX(260);

  LblPDFSub := TLabel.Create(WizardForm);
  LblPDFSub.Parent := PnlOptions;
  LblPDFSub.Caption := 'Fast viewing & AI document tools for PDF files';
  LblPDFSub.Font.Name := 'Segoe UI';
  LblPDFSub.Font.Size := 8;
  LblPDFSub.Font.Color := COLOR_HINT;
  LblPDFSub.Left := ScaleX(34);
  LblPDFSub.Top := ScaleY(146);

  // Option 4: Install Scope (All Users vs Current User)
  ChkAllUsers := TNewCheckBox.Create(WizardForm);
  ChkAllUsers.Parent := PnlOptions;
  ChkAllUsers.Caption := 'Install for all users';
  ChkAllUsers.Checked := False;
  ChkAllUsers.Font.Name := 'Segoe UI';
  ChkAllUsers.Font.Size := 9;
  ChkAllUsers.Font.Style := [fsBold];
  ChkAllUsers.Left := ScaleX(244);
  ChkAllUsers.Top := ScaleY(126);
  ChkAllUsers.Width := ScaleX(210);
  ChkAllUsers.OnClick := @ChkAllUsersClick;

  LblAllUsersSub := TLabel.Create(WizardForm);
  LblAllUsersSub.Parent := PnlOptions;
  LblAllUsersSub.Caption := 'System-wide (Program Files)';
  LblAllUsersSub.Font.Name := 'Segoe UI';
  LblAllUsersSub.Font.Size := 8;
  LblAllUsersSub.Font.Color := COLOR_HINT;
    LblAllUsersSub.Left := ScaleX(264);
  LblAllUsersSub.Top := ScaleY(146);

  // 1b. Terms & Conditions Screen (Modal Panel inside PnlMain)
  PnlTerms := TPanel.Create(WizardForm);
  PnlTerms.Parent := PnlMain;
  PnlTerms.SetBounds(0, 0, PnlMain.Width, ScaleY(440));
  PnlTerms.Color := clWhite;
  PnlTerms.BevelOuter := bvNone;
  PnlTerms.Visible := False;

  LblTermsTitle := TLabel.Create(WizardForm);
  LblTermsTitle.Parent := PnlTerms;
  LblTermsTitle.Caption := 'Terms of Service & License Agreement';
  LblTermsTitle.Font.Name := 'Segoe UI';
  LblTermsTitle.Font.Size := 11;
  LblTermsTitle.Font.Style := [fsBold];
  LblTermsTitle.Font.Color := COLOR_TEXT;
  LblTermsTitle.Left := ScaleX(20);
  LblTermsTitle.Top := ScaleY(12);

  LblTermsSub := TLabel.Create(WizardForm);
  LblTermsSub.Parent := PnlTerms;
  LblTermsSub.Caption := 'Please review the agreement below before installing Ocal Browser.';
  LblTermsSub.Font.Name := 'Segoe UI';
  LblTermsSub.Font.Size := 8;
  LblTermsSub.Font.Color := COLOR_MUTED;
  LblTermsSub.Left := ScaleX(20);
  LblTermsSub.Top := ScaleY(32);

  BtnOpenLicenseExternal := TLabel.Create(WizardForm);
  BtnOpenLicenseExternal.Parent := PnlTerms;
  BtnOpenLicenseExternal.Caption := 'Open in text editor ↗';
  BtnOpenLicenseExternal.Font.Name := 'Segoe UI';
  BtnOpenLicenseExternal.Font.Size := 8;
  BtnOpenLicenseExternal.Font.Color := COLOR_ACCENT;
  BtnOpenLicenseExternal.Font.Style := [fsBold];
  BtnOpenLicenseExternal.Cursor := crHand;
  BtnOpenLicenseExternal.Left := ScaleX(375);
  BtnOpenLicenseExternal.Top := ScaleY(16);
  BtnOpenLicenseExternal.OnClick := @BtnOpenLicenseExternalClick;

  MemoTerms := TNewMemo.Create(WizardForm);
  MemoTerms.Parent := PnlTerms;
  MemoTerms.SetBounds(ScaleX(20), ScaleY(52), ScaleX(480), ScaleY(325));
  MemoTerms.ReadOnly := True;
  MemoTerms.ScrollBars := ssVertical;
  MemoTerms.Font.Name := 'Consolas';
  MemoTerms.Font.Size := 8;
  MemoTerms.Color := $F8FAFC;

  BtnBackFromTerms := TNewButton.Create(WizardForm);
  BtnBackFromTerms.Parent := PnlTerms;
  BtnBackFromTerms.Caption := '← Back';
  BtnBackFromTerms.Font.Name := 'Segoe UI';
  BtnBackFromTerms.Font.Size := 9;
  BtnBackFromTerms.SetBounds(ScaleX(20), ScaleY(390), ScaleX(110), ScaleY(36));
  BtnBackFromTerms.OnClick := @BtnBackFromTermsClick;

  BtnAcceptFromTerms := TNewButton.Create(WizardForm);
  BtnAcceptFromTerms.Parent := PnlTerms;
  BtnAcceptFromTerms.Caption := 'Accept and Install';
  BtnAcceptFromTerms.Font.Name := 'Segoe UI';
  BtnAcceptFromTerms.Font.Size := 9;
  BtnAcceptFromTerms.Font.Style := [fsBold];
  BtnAcceptFromTerms.SetBounds(ScaleX(340), ScaleY(390), ScaleX(160), ScaleY(36));
  BtnAcceptFromTerms.OnClick := @BtnInstallClick;

  // 2. Installing Screen
  PnlInstalling := TPanel.Create(WizardForm);
  PnlInstalling.Parent := PnlMain;
  PnlInstalling.SetBounds(0, 0, PnlMain.Width, PnlMain.Height);
  PnlInstalling.Color := clWhite;
  PnlInstalling.BevelOuter := bvNone;
  PnlInstalling.Visible := False;

  if FileExists(LogoPath) then
  begin
    ImgInstallLogo := TBitmapImage.Create(WizardForm);
    ImgInstallLogo.Parent := PnlInstalling;
    ImgInstallLogo.SetBounds(ScaleX(28), ScaleY(22), ScaleX(52), ScaleY(52));
    ImgInstallLogo.Stretch := True;
    ImgInstallLogo.Bitmap.LoadFromFile(LogoPath);
  end;

  LblInstallTitle := TLabel.Create(WizardForm);
  LblInstallTitle.Parent := PnlInstalling;
  LblInstallTitle.Caption := 'Installing Ocal Browser...';
  LblInstallTitle.Font.Name := 'Segoe UI';
  LblInstallTitle.Font.Size := 15;
  LblInstallTitle.Font.Color := COLOR_TEXT;
  LblInstallTitle.Font.Style := [fsBold];
  LblInstallTitle.Left := ScaleX(94);
  LblInstallTitle.Top := ScaleY(22);

  LblInstallStatus := TLabel.Create(WizardForm);
  LblInstallStatus.Parent := PnlInstalling;
  LblInstallStatus.Caption := 'Extracting browser files and configuring features...';
  LblInstallStatus.Font.Name := 'Segoe UI';
  LblInstallStatus.Font.Color := COLOR_MUTED;
  LblInstallStatus.Font.Size := 9;
  LblInstallStatus.Left := ScaleX(96);
  LblInstallStatus.Top := ScaleY(50);
  LblInstallStatus.Width := ScaleX(330);

  LblProgressPct := TLabel.Create(WizardForm);
  LblProgressPct.Parent := PnlInstalling;
  LblProgressPct.Caption := '0%';
  LblProgressPct.Font.Name := 'Segoe UI';
  LblProgressPct.Font.Color := $00C78402; // Vibrant Ocal Azure (#0284C7)
  LblProgressPct.Font.Size := 9;
  LblProgressPct.Font.Style := [fsBold];
  LblProgressPct.Alignment := taRightJustify;
  LblProgressPct.SetBounds(ScaleX(430), ScaleY(50), ScaleX(62), ScaleY(18));

  // Sleek, modern custom progress bar (Outer track + inner vibrant fill)
  PnlProgressTrack := TPanel.Create(WizardForm);
  PnlProgressTrack.Parent := PnlInstalling;
  PnlProgressTrack.SetBounds(ScaleX(28), ScaleY(86), ScaleX(464), ScaleY(8));
  PnlProgressTrack.Color := $00E2E8F0; // #E2E8F0 (soft light slate track)
  PnlProgressTrack.BevelOuter := bvNone;

  PnlProgressFill := TPanel.Create(WizardForm);
  PnlProgressFill.Parent := PnlProgressTrack;
  PnlProgressFill.SetBounds(0, 0, 0, PnlProgressTrack.Height);
  PnlProgressFill.Color := $00D47800; // #0078D4 (vibrant Ocal blue accent)
  PnlProgressFill.BevelOuter := bvNone;

  // 3. Finished Screen
  PnlFinished := TPanel.Create(WizardForm);
  PnlFinished.Parent := PnlMain;
  PnlFinished.SetBounds(0, 0, PnlMain.Width, PnlMain.Height);
  PnlFinished.Color := clWhite;
  PnlFinished.BevelOuter := bvNone;
  PnlFinished.Visible := False;

  if FileExists(LogoPath) then
  begin
    ImgFinishLogo := TBitmapImage.Create(WizardForm);
    ImgFinishLogo.Parent := PnlFinished;
    ImgFinishLogo.SetBounds(ScaleX(28), ScaleY(22), ScaleX(52), ScaleY(52));
    ImgFinishLogo.Stretch := True;
    ImgFinishLogo.Bitmap.LoadFromFile(LogoPath);
  end;

  LblFinishedTitle := TLabel.Create(WizardForm);
  LblFinishedTitle.Parent := PnlFinished;
  LblFinishedTitle.Caption := 'Installation Complete!';
  LblFinishedTitle.Font.Name := 'Segoe UI';
  LblFinishedTitle.Font.Size := 16;
  LblFinishedTitle.Font.Color := COLOR_TEXT;
  LblFinishedTitle.Font.Style := [fsBold];
  LblFinishedTitle.Left := ScaleX(94);
  LblFinishedTitle.Top := ScaleY(22);

  LblFinishedSub := TLabel.Create(WizardForm);
  LblFinishedSub.Parent := PnlFinished;
  LblFinishedSub.Caption := 'Ocal Browser is ready to explore.';
  LblFinishedSub.Font.Name := 'Segoe UI';
  LblFinishedSub.Font.Color := COLOR_MUTED;
  LblFinishedSub.Font.Size := 9;
  LblFinishedSub.Left := ScaleX(96);
  LblFinishedSub.Top := ScaleY(50);

  BtnFinishLaunch := TNewButton.Create(WizardForm);
  BtnFinishLaunch.Parent := PnlFinished;
  BtnFinishLaunch.Caption := 'Launch Ocal Browser';
  BtnFinishLaunch.Font.Name := 'Segoe UI';
  BtnFinishLaunch.Font.Size := 10;
  BtnFinishLaunch.Font.Style := [fsBold];
  BtnFinishLaunch.SetBounds(ScaleX(94), ScaleY(84), ScaleX(220), ScaleY(38));
  BtnFinishLaunch.OnClick := @BtnFinishLaunchClick;
end;

procedure OpenFeedbackMail(Sender: TObject);
var
  ErrorCode: Integer;
  MailUrl: string;
begin
  MailUrl := 'mailto:gaming.network.studio.mg@gmail.com?subject=Ocal%20Browser%20Feedback%20%26%20Improvements&body=Hi%20Gaming%20Network%20Studio%20Team%2C%0A%0AI%20have%20some%20feedback%20or%20suggestions%20for%20Ocal%20Browser%3A%0A%0A';
  ShellExec('open', MailUrl, '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
end;

function InitializeUninstall(): Boolean;
var
  UninstConfirmForm: TSetupForm;
  ImgLogo: TBitmapImage;
  LblTitle, LblSub, LblFeedbackHint, LblFeedbackEmail: TLabel;
  PnlFeedbackCard: TPanel;
  BtnKeep, BtnUninstall, BtnFeedback: TNewButton;
  LogoPath: string;
  ErrorCode: Integer;
begin
  Result := False;

  // Silently proceed if silent uninstall flag was passed
  if UninstallSilent then
  begin
    Result := True;
    Exit;
  end;

  UninstConfirmForm := CreateCustomForm(ScaleX(480), ScaleY(240), False, False);
  try
    UninstConfirmForm.Caption := 'Ocal Browser Uninstall';
    UninstConfirmForm.Position := poScreenCenter;
    UninstConfirmForm.Color := clWhite;

    ApplyModernTitleBar(UninstConfirmForm.Handle);

    LogoPath := ExpandConstant('{app}\installer_logo.bmp');
    if FileExists(LogoPath) then
    begin
      ImgLogo := TBitmapImage.Create(UninstConfirmForm);
      ImgLogo.Parent := UninstConfirmForm;
      ImgLogo.SetBounds(ScaleX(28), ScaleY(22), ScaleX(52), ScaleY(52));
      ImgLogo.Stretch := True;
      ImgLogo.Bitmap.LoadFromFile(LogoPath);
    end;

    LblTitle := TLabel.Create(UninstConfirmForm);
    LblTitle.Parent := UninstConfirmForm;
    LblTitle.Caption := 'Uninstall Ocal Browser?';
    LblTitle.Font.Name := 'Segoe UI';
    LblTitle.Font.Size := 15;
    LblTitle.Font.Color := COLOR_TEXT;
    LblTitle.Font.Style := [fsBold];
    LblTitle.SetBounds(ScaleX(94), ScaleY(20), ScaleX(360), ScaleY(26));

    LblSub := TLabel.Create(UninstConfirmForm);
    LblSub.Parent := UninstConfirmForm;
    LblSub.Caption := 'Are you sure you want to completely remove Ocal Browser and all of its components from your PC?';
    LblSub.Font.Name := 'Segoe UI';
    LblSub.Font.Color := COLOR_MUTED;
    LblSub.Font.Size := 9;
    LblSub.WordWrap := True;
    LblSub.SetBounds(ScaleX(94), ScaleY(48), ScaleX(360), ScaleY(38));

    // Modern feedback card
    PnlFeedbackCard := TPanel.Create(UninstConfirmForm);
    PnlFeedbackCard.Parent := UninstConfirmForm;
    PnlFeedbackCard.SetBounds(ScaleX(28), ScaleY(96), ScaleX(424), ScaleY(74));
    PnlFeedbackCard.Color := $00F8FAFC;
    PnlFeedbackCard.BevelOuter := bvNone;

    LblFeedbackHint := TLabel.Create(UninstConfirmForm);
    LblFeedbackHint.Parent := PnlFeedbackCard;
    LblFeedbackHint.Caption := 'Help us improve! Send your feedback or suggestions:';
    LblFeedbackHint.Font.Name := 'Segoe UI';
    LblFeedbackHint.Font.Size := 8;
    LblFeedbackHint.Font.Color := COLOR_MUTED;
    LblFeedbackHint.SetBounds(ScaleX(14), ScaleY(10), ScaleX(396), ScaleY(18));

    LblFeedbackEmail := TLabel.Create(UninstConfirmForm);
    LblFeedbackEmail.Parent := PnlFeedbackCard;
    LblFeedbackEmail.Caption := '✉ gaming.network.studio.mg@gmail.com';
    LblFeedbackEmail.Font.Name := 'Segoe UI';
    LblFeedbackEmail.Font.Size := 9;
    LblFeedbackEmail.Font.Style := [fsBold, fsUnderline];
    LblFeedbackEmail.Font.Color := $00C78402; // Vibrant Ocal Azure (#0284C7)
    LblFeedbackEmail.Cursor := crHand;
    LblFeedbackEmail.SetBounds(ScaleX(14), ScaleY(34), ScaleX(270), ScaleY(20));
    LblFeedbackEmail.OnClick := @OpenFeedbackMail;

    BtnFeedback := TNewButton.Create(UninstConfirmForm);
    BtnFeedback.Parent := PnlFeedbackCard;
    BtnFeedback.Caption := 'Send Feedback';
    BtnFeedback.Font.Name := 'Segoe UI';
    BtnFeedback.Font.Size := 8;
    BtnFeedback.Font.Style := [fsBold];
    BtnFeedback.SetBounds(ScaleX(296), ScaleY(30), ScaleX(114), ScaleY(28));
    BtnFeedback.OnClick := @OpenFeedbackMail;

    // Action Buttons
    BtnKeep := TNewButton.Create(UninstConfirmForm);
    BtnKeep.Parent := UninstConfirmForm;
    BtnKeep.Caption := 'Keep Ocal Browser';
    BtnKeep.Font.Name := 'Segoe UI';
    BtnKeep.Font.Size := 9;
    BtnKeep.Font.Style := [fsBold];
    BtnKeep.ModalResult := mrCancel;
    BtnKeep.SetBounds(ScaleX(204), ScaleY(188), ScaleX(142), ScaleY(34));

    BtnUninstall := TNewButton.Create(UninstConfirmForm);
    BtnUninstall.Parent := UninstConfirmForm;
    BtnUninstall.Caption := 'Uninstall';
    BtnUninstall.Font.Name := 'Segoe UI';
    BtnUninstall.Font.Size := 9;
    BtnUninstall.Font.Style := [fsBold];
    BtnUninstall.ModalResult := mrYes;
    BtnUninstall.SetBounds(ScaleX(354), ScaleY(188), ScaleX(98), ScaleY(34));

    UninstConfirmForm.ActiveControl := BtnKeep;

    if UninstConfirmForm.ShowModal = mrYes then
    begin
      Exec(ExpandConstant('{uninstallexe}'), '/SILENT /NORESTART', '', SW_SHOW, ewNoWait, ErrorCode);
      Result := False;
    end
    else
      Result := False;
  finally
    UninstConfirmForm.Free;
  end;
end;

// ── Light Uninstaller GUI ───────
procedure InitializeUninstallProgressForm();
var
  LblUninstTitle, LblUninstSub: TLabel;
  UninstLogo: TBitmapImage;
  LogoPath: string;
begin
  UninstallProgressForm.Caption := 'Ocal Browser Uninstaller';
  UninstallProgressForm.ClientWidth := ScaleX(520);
  UninstallProgressForm.ClientHeight := ScaleY(210);
  UninstallProgressForm.Position := poScreenCenter;
  UninstallProgressForm.Color := clWhite;
  UninstallProgressForm.Bevel.Hide;

  // Apply seamless white titlebar styling matching light theme
  ApplyModernTitleBar(UninstallProgressForm.Handle);

  LogoPath := ExpandConstant('{app}\installer_logo.bmp');
  if FileExists(LogoPath) then
  begin
    UninstLogo := TBitmapImage.Create(UninstallProgressForm);
    UninstLogo.Parent := UninstallProgressForm;
    UninstLogo.SetBounds(ScaleX(28), ScaleY(22), ScaleX(52), ScaleY(52));
    UninstLogo.Stretch := True;
    UninstLogo.Bitmap.LoadFromFile(LogoPath);
  end;

  LblUninstTitle := TLabel.Create(UninstallProgressForm);
  LblUninstTitle.Parent := UninstallProgressForm;
  LblUninstTitle.Caption := 'Uninstalling Ocal Browser...';
  LblUninstTitle.Font.Name := 'Segoe UI';
  LblUninstTitle.Font.Size := 15;
  LblUninstTitle.Font.Color := COLOR_TEXT;
  LblUninstTitle.Font.Style := [fsBold];
  LblUninstTitle.Left := ScaleX(94);
  LblUninstTitle.Top := ScaleY(22);

  LblUninstSub := TLabel.Create(UninstallProgressForm);
  LblUninstSub.Parent := UninstallProgressForm;
  LblUninstSub.Caption := 'Removing leftover files and restoring system default browser...';
  LblUninstSub.Font.Name := 'Segoe UI';
  LblUninstSub.Font.Color := COLOR_MUTED;
  LblUninstSub.Font.Size := 9;
  LblUninstSub.Left := ScaleX(96);
  LblUninstSub.Top := ScaleY(50);

  UninstallProgressForm.ClientHeight := ScaleY(150);
  UninstallProgressForm.ProgressBar.Parent := UninstallProgressForm;
  UninstallProgressForm.ProgressBar.SetBounds(ScaleX(28), ScaleY(86), ScaleX(464), ScaleY(10));

  UninstallProgressForm.StatusLabel.Parent := UninstallProgressForm;
  UninstallProgressForm.StatusLabel.SetBounds(ScaleX(28), ScaleY(106), ScaleX(464), ScaleY(20));
  UninstallProgressForm.StatusLabel.Font.Name := 'Segoe UI';
  UninstallProgressForm.StatusLabel.Font.Color := COLOR_MUTED;
end;

procedure CleanExplorerOpenWith(const Ext: string; const ProgId: string; const ExeName: string);
var
  SubKeyProg, SubKeyList, Mru, ValName: string;
  Names: TArrayOfString;
  I: Integer;
begin
  SubKeyProg := 'Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\' + Ext + '\OpenWithProgids';
  if RegValueExists(HKCU, SubKeyProg, ProgId) then
    RegDeleteValue(HKCU, SubKeyProg, ProgId);

  SubKeyList := 'Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\' + Ext + '\OpenWithList';
  if RegKeyExists(HKCU, SubKeyList) then
  begin
    if RegGetValueNames(HKCU, SubKeyList, Names) then
    begin
      for I := 0 to GetArrayLength(Names) - 1 do
      begin
        ValName := Names[I];
        if (ValName <> 'MRUList') then
        begin
          if RegQueryStringValue(HKCU, SubKeyList, ValName, Mru) then
          begin
            if CompareText(Mru, ExeName) = 0 then
              RegDeleteValue(HKCU, SubKeyList, ValName);
          end;
        end;
      end;
    end;
  end;
end;

procedure RevertDefaultBrowser();
var
  CurrentBrowser: string;
begin
  RegQueryStringValue(HKCU, 'Software\Clients\StartMenuInternet', '', CurrentBrowser);
  if (CompareText(CurrentBrowser, 'OcalBrowser') = 0) or (CurrentBrowser = '') then
  begin
    if RegKeyExists(HKLM, 'Software\Clients\StartMenuInternet\Microsoft Edge') or
       RegKeyExists(HKCU, 'Software\Clients\StartMenuInternet\Microsoft Edge') then
    begin
      RegWriteStringValue(HKCU, 'Software\Clients\StartMenuInternet', '', 'Microsoft Edge');
    end
    else if RegKeyExists(HKLM, 'Software\Clients\StartMenuInternet\OperaStable') or
            RegKeyExists(HKCU, 'Software\Clients\StartMenuInternet\OperaStable') then
    begin
      RegWriteStringValue(HKCU, 'Software\Clients\StartMenuInternet', '', 'OperaStable');
    end
    else if RegKeyExists(HKLM, 'Software\Clients\StartMenuInternet\Google Chrome') or
            RegKeyExists(HKCU, 'Software\Clients\StartMenuInternet\Google Chrome') then
    begin
      RegWriteStringValue(HKCU, 'Software\Clients\StartMenuInternet', '', 'Google Chrome');
    end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  AppDir1, AppDir2, LocalDir1, LocalDir2: string;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // 1. Remove all leftover AppData directories
    AppDir1 := ExpandConstant('{userappdata}\ocal');
    AppDir2 := ExpandConstant('{userappdata}\Ocal Browser');
    LocalDir1 := ExpandConstant('{localappdata}\ocal');
    LocalDir2 := ExpandConstant('{localappdata}\Ocal Browser');

    if DirExists(AppDir1) then DelTree(AppDir1, True, True, True);
    if DirExists(AppDir2) then DelTree(AppDir2, True, True, True);
    if DirExists(LocalDir1) then DelTree(LocalDir1, True, True, True);
    if DirExists(LocalDir2) then DelTree(LocalDir2, True, True, True);

    // 2. Remove all Ocal registry keys
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Clients\StartMenuInternet\OcalBrowser');
    RegDeleteKeyIncludingSubkeys(HKLM, 'Software\Clients\StartMenuInternet\OcalBrowser');
    RegDeleteValue(HKCU, 'Software\RegisteredApplications', 'OcalBrowser');
    RegDeleteValue(HKLM, 'Software\RegisteredApplications', 'OcalBrowser');

    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\OcalHTML');
    RegDeleteKeyIncludingSubkeys(HKLM, 'Software\Classes\OcalHTML');
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\Ocal.PDF');
    RegDeleteKeyIncludingSubkeys(HKLM, 'Software\Classes\Ocal.PDF');

    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\Applications\Ocal Browser.exe');
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\Applications\Ocal.exe');
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\AppUserModelId\com.ocal.browser.v2');
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Classes\ocal');
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\OcalBrowser');
    RegDeleteKeyIncludingSubkeys(HKLM, 'Software\OcalBrowser');
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\com.ocal.browser.v2');
    RegDeleteKeyIncludingSubkeys(HKCU, 'Software\Microsoft\Windows\CurrentVersion\PushNotifications\Backup\com.ocal.browser.v2');

    // 3. Clean FileExts OpenWith lists
    CleanExplorerOpenWith('.html', 'OcalHTML', 'Ocal Browser.exe');
    CleanExplorerOpenWith('.htm', 'OcalHTML', 'Ocal Browser.exe');
    CleanExplorerOpenWith('.shtml', 'OcalHTML', 'Ocal Browser.exe');
    CleanExplorerOpenWith('.xht', 'OcalHTML', 'Ocal Browser.exe');
    CleanExplorerOpenWith('.xhtml', 'OcalHTML', 'Ocal Browser.exe');
    CleanExplorerOpenWith('.svg', 'OcalHTML', 'Ocal Browser.exe');
    CleanExplorerOpenWith('.webp', 'OcalHTML', 'Ocal Browser.exe');
    CleanExplorerOpenWith('.pdf', 'Ocal.PDF', 'Ocal Browser.exe');

    // 4. Revert Default Browser to Edge or Opera or Chrome
    RevertDefaultBrowser();

    // 5. Notify Windows Shell
    SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_FLUSH, 0, 0);
  end;
end;



