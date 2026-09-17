import winreg
import os

# App paths
app_dir = r"C:\Users\neelk\AppData\Local\Programs\Ocal"
exe_path = os.path.join(app_dir, "Ocal Browser.exe")
icon_path = os.path.join(app_dir, "icon.ico") + ",0"
pdf_icon_path = os.path.join(app_dir, "pdf-icon.ico") + ",0"
open_cmd = f'"{exe_path}" -- "%1"'
open_pdf_cmd = f'"{exe_path}" "%1"'

def set_key(root, subkey, values):
    key = winreg.CreateKey(root, subkey)
    for name, val, val_type in values:
        if name == "":
            winreg.SetValue(root, subkey, val_type, val)
        else:
            winreg.SetValueEx(key, name, 0, val_type, val)
    winreg.CloseKey(key)

print("Configuring Ocal registry entries...")

# 1. Ocal.PDF ProgID
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Ocal.PDF", [
    ("", "Ocal PDF Document", winreg.REG_SZ),
    ("FriendlyTypeName", "Ocal PDF Document", winreg.REG_SZ),
    ("FriendlyAppName", "Ocal Browser", winreg.REG_SZ),
    ("AppUserModelId", "com.ocal.browser.v2", winreg.REG_SZ),
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Ocal.PDF\DefaultIcon", [
    ("", pdf_icon_path, winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Ocal.PDF\Application", [
    ("ApplicationName", "Ocal Browser", winreg.REG_SZ),
    ("ApplicationIcon", icon_path, winreg.REG_SZ),
    ("ApplicationCompany", "Gaming Network Studio Media Group", winreg.REG_SZ),
    ("ApplicationDescription", "Ocal Browser PDF Document", winreg.REG_SZ),
    ("AppUserModelId", "com.ocal.browser.v2", winreg.REG_SZ),
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Ocal.PDF\shell\open", [
    ("FriendlyAppName", "Ocal Browser", winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Ocal.PDF\shell\open\command", [
    ("", open_pdf_cmd, winreg.REG_SZ)
])

# 2. OcalHTML ProgID
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\OcalHTML", [
    ("", "Ocal HTML Document", winreg.REG_SZ),
    ("FriendlyTypeName", "Ocal HTML Document", winreg.REG_SZ),
    ("FriendlyAppName", "Ocal Browser", winreg.REG_SZ),
    ("URL Protocol", "", winreg.REG_SZ),
    ("AppUserModelId", "com.ocal.browser.v2", winreg.REG_SZ),
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\OcalHTML\DefaultIcon", [
    ("", icon_path, winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\OcalHTML\Application", [
    ("ApplicationName", "Ocal Browser", winreg.REG_SZ),
    ("ApplicationIcon", icon_path, winreg.REG_SZ),
    ("ApplicationCompany", "Gaming Network Studio Media Group", winreg.REG_SZ),
    ("ApplicationDescription", "Ocal Browser is a modern, ultra-fast, and secure web browser.", winreg.REG_SZ),
    ("AppUserModelId", "com.ocal.browser.v2", winreg.REG_SZ),
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\OcalHTML\shell\open", [
    ("FriendlyAppName", "Ocal Browser", winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\OcalHTML\shell\open\command", [
    ("", open_cmd, winreg.REG_SZ)
])

# 3. StartMenuInternet
set_key(winreg.HKEY_CURRENT_USER, r"Software\Clients\StartMenuInternet\OcalBrowser", [
    ("", "Ocal Browser", winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Clients\StartMenuInternet\OcalBrowser\DefaultIcon", [
    ("", icon_path, winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Clients\StartMenuInternet\OcalBrowser\InstallInfo", [
    ("IconsVisible", 1, winreg.REG_DWORD)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Clients\StartMenuInternet\OcalBrowser\shell\open\command", [
    ("", f'"{exe_path}"', winreg.REG_SZ)
])

# 4. Capabilities
set_key(winreg.HKEY_CURRENT_USER, r"Software\Clients\StartMenuInternet\OcalBrowser\Capabilities", [
    ("ApplicationName", "Ocal Browser", winreg.REG_SZ),
    ("ApplicationIcon", icon_path, winreg.REG_SZ),
    ("ApplicationDescription", "Ocal Browser is a modern, ultra-fast, and secure web browser powered by intelligent AI.", winreg.REG_SZ),
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\StartMenu", [
    ("StartMenuInternet", "OcalBrowser", winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations", [
    (".htm", "OcalHTML", winreg.REG_SZ),
    (".html", "OcalHTML", winreg.REG_SZ),
    (".shtml", "OcalHTML", winreg.REG_SZ),
    (".xht", "OcalHTML", winreg.REG_SZ),
    (".xhtml", "OcalHTML", winreg.REG_SZ),
    (".svg", "OcalHTML", winreg.REG_SZ),
    (".webp", "OcalHTML", winreg.REG_SZ),
    (".pdf", "Ocal.PDF", winreg.REG_SZ),
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\UrlAssociations", [
    ("http", "OcalHTML", winreg.REG_SZ),
    ("https", "OcalHTML", winreg.REG_SZ),
    ("ftp", "OcalHTML", winreg.REG_SZ),
    ("ocal", "OcalHTML", winreg.REG_SZ),
])

# 5. RegisteredApplications
set_key(winreg.HKEY_CURRENT_USER, r"Software\RegisteredApplications", [
    ("OcalBrowser", r"Software\Clients\StartMenuInternet\OcalBrowser\Capabilities", winreg.REG_SZ)
])

# 6. Applications\Ocal Browser.exe
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Applications\Ocal Browser.exe", [
    ("", "Ocal Browser", winreg.REG_SZ),
    ("FriendlyAppName", "Ocal Browser", winreg.REG_SZ),
    ("ApplicationCompany", "Gaming Network Studio Media Group", winreg.REG_SZ),
    ("SupportedProtocols", "http;https;ftp;ocal", winreg.REG_SZ),
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Applications\Ocal Browser.exe\DefaultIcon", [
    ("", icon_path, winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Applications\Ocal Browser.exe\SupportedTypes", [
    (".pdf", "", winreg.REG_SZ),
    (".htm", "", winreg.REG_SZ),
    (".html", "", winreg.REG_SZ),
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Applications\Ocal Browser.exe\shell\open", [
    ("FriendlyAppName", "Ocal Browser", winreg.REG_SZ)
])
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Applications\Ocal Browser.exe\shell\open\command", [
    ("", open_cmd, winreg.REG_SZ)
])

# 7. AppUserModelId
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\AppUserModelId\com.ocal.browser.v2", [
    ("DisplayName", "Ocal Browser", winreg.REG_SZ),
    ("IconUri", os.path.join(app_dir, "icon.ico"), winreg.REG_SZ),
    ("ShowInSettings", 1, winreg.REG_DWORD),
])

# 8. MuiCache
set_key(winreg.HKEY_CURRENT_USER, r"Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache", [
    (f"{exe_path}.FriendlyAppName", "Ocal Browser", winreg.REG_SZ),
    (f"{exe_path}.ApplicationCompany", "Gaming Network Studio Media Group", winreg.REG_SZ),
])

print("All registry keys applied successfully via Python winreg!")
