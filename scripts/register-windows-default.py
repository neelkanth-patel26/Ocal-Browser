import os
import subprocess

exe_path = r'C:\Project\Gaming Network\Software\Brower\dist-builder\win-unpacked\Ocal Browser.exe'
if not os.path.exists(exe_path):
    exe_path = os.path.expandvars(r'%LOCALAPPDATA%\Programs\Ocal Browser\Ocal Browser.exe')

icon_path = r'C:\Project\Gaming Network\Software\Brower\icon.ico'
pdf_icon_path = r'C:\Project\Gaming Network\Software\Brower\pdf-icon.ico'

cmds = [
    # ProgId OcalHTML
    ['reg', 'add', r'HKCU\Software\Classes\OcalHTML', '/ve', '/d', 'Ocal HTML Document', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\OcalHTML', '/v', 'FriendlyTypeName', '/d', 'Ocal HTML Document', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\OcalHTML', '/v', 'URL Protocol', '/d', '', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\OcalHTML', '/v', 'AppUserModelId', '/d', 'com.ocal.browser.v2', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\OcalHTML\DefaultIcon', '/ve', '/d', f'{icon_path},0', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\OcalHTML\shell\open\command', '/ve', '/d', f'"{exe_path}" -- "%1"', '/f'],

    # ProgId OcalPDF
    ['reg', 'add', r'HKCU\Software\Classes\Ocal.PDF', '/ve', '/d', 'Ocal PDF Document', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\Ocal.PDF', '/v', 'FriendlyTypeName', '/d', 'Ocal PDF Document', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\Ocal.PDF', '/v', 'AppUserModelId', '/d', 'com.ocal.browser.v2', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\Ocal.PDF\DefaultIcon', '/ve', '/d', f'{pdf_icon_path},0', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\Ocal.PDF\shell\open\command', '/ve', '/d', f'"{exe_path}" "%1"', '/f'],

    # StartMenuInternet
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser', '/ve', '/d', 'Ocal Browser', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\DefaultIcon', '/ve', '/d', f'{icon_path},0', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\InstallInfo', '/v', 'IconsVisible', '/t', 'REG_DWORD', '/d', '1', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\shell\open\command', '/ve', '/d', f'"{exe_path}"', '/f'],

    # Capabilities
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities', '/v', 'ApplicationName', '/d', 'Ocal Browser', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities', '/v', 'ApplicationIcon', '/d', f'{icon_path},0', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities', '/v', 'ApplicationDescription', '/d', 'Ocal Browser is a modern, ultra-fast, and secure web browser powered by intelligent AI.', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\StartMenu', '/v', 'StartMenuInternet', '/d', 'OcalBrowser', '/f'],

    # FileAssociations
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations', '/v', '.htm', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations', '/v', '.html', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations', '/v', '.shtml', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations', '/v', '.xht', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations', '/v', '.xhtml', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations', '/v', '.svg', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations', '/v', '.webp', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\FileAssociations', '/v', '.pdf', '/d', 'Ocal.PDF', '/f'],

    # UrlAssociations
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\UrlAssociations', '/v', 'http', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\UrlAssociations', '/v', 'https', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\UrlAssociations', '/v', 'ftp', '/d', 'OcalHTML', '/f'],
    ['reg', 'add', r'HKCU\Software\Clients\StartMenuInternet\OcalBrowser\Capabilities\UrlAssociations', '/v', 'ocal', '/d', 'OcalHTML', '/f'],

    # RegisteredApplications
    ['reg', 'add', r'HKCU\Software\RegisteredApplications', '/v', 'OcalBrowser', '/d', r'Software\Clients\StartMenuInternet\OcalBrowser\Capabilities', '/f'],

    # Applications
    ['reg', 'add', r'HKCU\Software\Classes\Applications\Ocal Browser.exe', '/ve', '/d', 'Ocal Browser', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\Applications\Ocal Browser.exe', '/v', 'FriendlyAppName', '/d', 'Ocal Browser', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\Applications\Ocal Browser.exe', '/v', 'SupportedProtocols', '/d', 'http;https;ftp;ocal', '/f'],
    ['reg', 'add', r'HKCU\Software\Classes\Applications\Ocal Browser.exe\shell\open\command', '/ve', '/d', f'"{exe_path}" -- "%1"', '/f']
]

for cmd in cmds:
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print('Error running:', cmd, res.stderr)

print('Ocal Browser successfully registered in Windows Settings (Default Apps)!')
