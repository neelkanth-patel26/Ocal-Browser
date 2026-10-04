#define MyAppName "Ocal Browser"
#define MyAppVersion "9.8.9"
#define MyAppPublisher "Gaming Network Studio"
#define MyAppURL "https://github.com/neelkanth-patel26/Ocal-Browser"

[Setup]
AppId={{C78912A4-F2D1-4E89-B285-48E0D7B48102}}
AppName={#MyAppName} (MSIX Edition)
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion} (MSIX)
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Ocal Browser
DisableDirPage=yes
DisableProgramGroupPage=yes
OutputBaseFilename=Ocal-MSIX-Setup
OutputDir=dist-store
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
Uninstallable=no
SetupIconFile=icon.ico

[Files]
Source: "GamingNetworkStudioMediaGroup.cer"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: "dist-store\Ocal Browser {#MyAppVersion}.msix"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Run]
; 1. Trust certificate in Local Machine stores (resolves 0x800B010A root chain verification)
Filename: "{sys}\certutil.exe"; Parameters: "-addstore -f ""Root"" ""{tmp}\GamingNetworkStudioMediaGroup.cer"""; Flags: runhidden waituntilterminated
Filename: "{sys}\certutil.exe"; Parameters: "-addstore -f ""TrustedPeople"" ""{tmp}\GamingNetworkStudioMediaGroup.cer"""; Flags: runhidden waituntilterminated
Filename: "{sys}\certutil.exe"; Parameters: "-addstore -f ""TrustedPublisher"" ""{tmp}\GamingNetworkStudioMediaGroup.cer"""; Flags: runhidden waituntilterminated

; 2. Deploy MSIX package into Windows
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Add-AppxPackage -Path '{tmp}\Ocal Browser {#MyAppVersion}.msix'"""; Flags: runhidden waituntilterminated; StatusMsg: "Deploying Ocal Browser MSIX into Windows..."
