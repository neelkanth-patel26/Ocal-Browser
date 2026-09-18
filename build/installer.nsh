; ============================================================
; Ocal Browser - Custom NSIS Uninstaller Script
; Fully cleans all leftover files, registry entries, and restores default browser
; ============================================================

!macro customUnInstall
  DetailPrint "Cleaning Ocal Browser app data and leftover files..."
  RMDir /r "$APPDATA\ocal"
  RMDir /r "$APPDATA\Ocal Browser"
  RMDir /r "$LOCALAPPDATA\ocal"
  RMDir /r "$LOCALAPPDATA\Ocal Browser"
  RMDir /r "$LOCALAPPDATA\Programs\Ocal"

  DetailPrint "Cleaning Ocal Browser registry associations..."
  DeleteRegKey HKCU "Software\Clients\StartMenuInternet\OcalBrowser"
  DeleteRegKey HKLM "Software\Clients\StartMenuInternet\OcalBrowser"
  DeleteRegValue HKCU "Software\RegisteredApplications" "OcalBrowser"
  DeleteRegValue HKLM "Software\RegisteredApplications" "OcalBrowser"

  DeleteRegKey HKCU "Software\Classes\OcalHTML"
  DeleteRegKey HKLM "Software\Classes\OcalHTML"
  DeleteRegKey HKCU "Software\Classes\Ocal.PDF"
  DeleteRegKey HKLM "Software\Classes\Ocal.PDF"

  DeleteRegKey HKCU "Software\Classes\Applications\Ocal Browser.exe"
  DeleteRegKey HKCU "Software\Classes\Applications\Ocal.exe"
  DeleteRegKey HKCU "Software\Classes\AppUserModelId\com.ocal.browser.v2"
  DeleteRegKey HKCU "Software\Classes\ocal"
  DeleteRegKey HKCU "Software\OcalBrowser"
  DeleteRegKey HKLM "Software\OcalBrowser"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\com.ocal.browser.v2"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\PushNotifications\Backup\com.ocal.browser.v2"

  ; Clean FileExts OpenWithProgids
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.html\OpenWithProgids" "OcalHTML"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.htm\OpenWithProgids" "OcalHTML"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.shtml\OpenWithProgids" "OcalHTML"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.xht\OpenWithProgids" "OcalHTML"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.xhtml\OpenWithProgids" "OcalHTML"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.svg\OpenWithProgids" "OcalHTML"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.webp\OpenWithProgids" "OcalHTML"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.pdf\OpenWithProgids" "Ocal.PDF"

  ; Revert default browser to Microsoft Edge or Opera or Chrome if Ocal was default
  ReadRegStr $0 HKCU "Software\Clients\StartMenuInternet" ""
  ${If} $0 == "OcalBrowser"
  ${OrIf} $0 == ""
    ReadRegStr $1 HKLM "Software\Clients\StartMenuInternet\Microsoft Edge" ""
    ${If} $1 != ""
      WriteRegStr HKCU "Software\Clients\StartMenuInternet" "" "Microsoft Edge"
    ${Else}
      ReadRegStr $2 HKLM "Software\Clients\StartMenuInternet\OperaStable" ""
      ${If} $2 != ""
        WriteRegStr HKCU "Software\Clients\StartMenuInternet" "" "OperaStable"
      ${Else}
        ReadRegStr $3 HKLM "Software\Clients\StartMenuInternet\Google Chrome" ""
        ${If} $3 != ""
          WriteRegStr HKCU "Software\Clients\StartMenuInternet" "" "Google Chrome"
        ${EndIf}
      ${EndIf}
    ${EndIf}
  ${EndIf}

  ; Notify Windows Shell that associations have updated
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, i 0, i 0)'
!macroend
