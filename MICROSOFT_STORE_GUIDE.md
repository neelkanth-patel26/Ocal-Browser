# 🏪 Publishing Ocal Browser to the Microsoft Store

This guide explains the complete process to publish **Ocal Browser** to the Microsoft Store.

---

## 🚀 Two Methods to Publish to Microsoft Store

Microsoft Store now provides **two ways** for desktop developers to publish apps:

| Method | Description | Best For |
| :--- | :--- | :--- |
| **Method 1: Direct Win32 (.exe) Submission** | Submit your Inno Setup `.exe` directly. Microsoft hosts the store listing and runs your installer silently on user machines. | **Easiest & Fastest** (No packaging conversion needed, uses existing installer). |
| **Method 2: Packaged AppX / MSIX** | Build a native Windows container package using `npm run build-store`. Microsoft installs and updates it automatically through the Store engine. | **Modern & Clean** (Sandboxed, clean uninstall, tile assets, automatic background store updates). |

---

## 🛠️ Method 1: Direct Win32 (.exe) Submission (Easiest & Recommended)

Microsoft Partner Center allows submitting traditional Win32 installers directly without repacking:

1. **Build the Inno Installer**:
   ```bash
   npm run build-inno
   ```
   This generates: `dist-inno\Ocal-9.1.05-Setup.exe`.

2. **Host the Installer**:
   Upload `Ocal-9.1.05-Setup.exe` to a permanent public direct-download URL.
   - **GitHub Release Verified Direct Link**:
     `https://github.com/neelkanth-patel26/Ocal-Browser/releases/download/v9.1.05/Ocal-9.1.05-Setup.exe`

3. **In Microsoft Partner Center**:
   - Create or edit your submission under **Apps and Games** > **Ocal Browser** > **Packages / Installer details**.
   - **Architecture**: Select **`x64` ONLY** (or `x64` and `x86`).
     > [!CRITICAL]
     > **DO NOT select `ARM64` or `Neutral`** for an x64 Win32 EXE installer!
     > On Qualcomm Snapdragon ARM64 devices (like Microsoft Surface Laptop), selecting `ARM64` causes the Store to expect a native ARM64 binary. Selecting `x64` enables Windows 11's built-in **Prism x64 emulation**, allowing Ocal Browser to install and run perfectly.
   - **Installer URL (Download URL)**:
     `https://github.com/neelkanth-patel26/Ocal-Browser/releases/download/v9.1.05/Ocal-9.1.05-Setup.exe`
   - **Silent Install Parameters**: `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-`
   - **Silent Uninstall Parameters**: `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART`
   - **Package or Product Name in Add/Remove Programs**: `Ocal Browser`
   - **Publisher Name in Add/Remove Programs**: `Gaming Network Studio Media Group`
   - **Install return codes (Exit codes)**: `0` for success
   - Submit for certification.

### 📋 Partner Center Ingestion Checks Reference

When Partner Center runs automated tests on your installer, it performs key checks:

| Partner Center Check | Why it Failed Previously | How We Fixed It |
| :--- | :--- | :--- |
| **10.3.4 App Is Testable** (`Unsupported 16-Bit Application` on Microsoft Surface Laptop) | **Root Cause 1**: The release tag `v9.1.05` was initially created without the attached `Ocal-9.1.05-Setup.exe` binary. The download URL returned an HTTP 404 HTML page. When Windows saves an HTML error page as an `.exe` and attempts to execute it, the OS cannot read a PE header and throws `"Unsupported 16-Bit Application"`.<br>**Root Cause 2**: If `ARM64` was checked in Partner Center, the ARM64 Surface Laptop rejected non-native execution without emulation flags. | **1.** Streamed and uploaded the complete 152 MB binary (`Ocal-9.1.05-Setup.exe`) to GitHub Release `v9.1.05`. Validated direct streaming with HTTP 200 and authentic `MZ` PE header.<br>**2.** Configured Inno Setup with `ArchitecturesInstallIn64BitMode=x64compatible` and specified `x64` architecture in Partner Center for clean Prism emulation on Snapdragon Surface Laptops. |
| **Silent install check** | The installer requested administrative elevation (`PrivilegesRequired=admin`) and was missing `/SP- /SUPPRESSMSGBOXES`, which popped up prompts in Microsoft's headless VM. | Configured `PrivilegesRequired=lowest` with dual-mode fallback, set `CloseApplications=no`, and added `/SP- /SUPPRESSMSGBOXES` flags. Returns exit code `0`. |
| **Entry in add or remove programs** | The silent installer was failing before writing registry keys, or the name did not match (`Ocal Browser 9.1.03` vs `Ocal Browser`). | Set a permanent `AppId`, configured `UninstallDisplayName=Ocal Browser`, and `AppPublisher=Gaming Network Studio Media Group` in `HKA`. |
| **Bundleware check** | Automated scanner could not inspect the installed entry because the silent installation aborted. | By passing the silent install and registering cleanly under `Ocal Browser`, the bundleware scanner now identifies the app and validates no unlisted software is bundled. |
| **Code signing check** (`Package should be signed with SHA256 or higher algorithm`) | The hosted `.exe` installer at your download URL was unsigned (`Code signing type: Unsigned`). | Sign `dist-inno\Ocal-9.1.05-Setup.exe` using `npm run sign-installer` (with your Authenticode `.pfx` certificate) or use a direct URL with valid signature. |

---

## 📦 Method 2: MSIX / AppX Store Package Submission

If you want a native Microsoft Store package:

### Step 1: Reserve Your App in Partner Center
1. Go to [Microsoft Partner Center Dashboard](https://partner.microsoft.com/dashboard).
2. Click **Apps and Games** > **New Product** > **MSIX or PWA app**.
3. Reserve your app name: `Ocal Browser`.

### Step 2: Retrieve Product Identity
1. In Partner Center, go to **Product management** > **Product Identity**.
2. Note down the three values:
   - **Package/Identity/Name** (e.g., `GamingNetworkStudioMediaGroup.OcalBrowser`)
   - **Package/Identity/Publisher** (e.g., `CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)
   - **Publisher display name** (e.g., `Gaming Network Studio Media Group`)

### Step 3: Insert Identity into `package.json`
Open `package.json` and locate the `"appx"` block:
```json
"appx": {
  "applicationId": "OcalBrowser",
  "identityName": "YOUR_PACKAGE_IDENTITY_NAME",
  "publisher": "YOUR_PACKAGE_IDENTITY_PUBLISHER",
  "publisherDisplayName": "YOUR_PUBLISHER_DISPLAY_NAME",
  "displayName": "Ocal Browser",
  "backgroundColor": "#0c0d12",
  "languages": ["en-US"],
  "showNameOnTiles": true,
  "setBuildNumber": true,
  "assets": "build/appx"
}
```

### Step 4: Build Store Package
Run the dedicated script:
```bash
npm run build-store
```
This will:
- Verify and generate high-resolution Store tile assets (`Square44x44Logo`, `Square150x150Logo`, `Wide310x150Logo`, `StoreLogo`) in `build/appx/`.
- Package the application into `.appx` / `.msix` inside `dist-store/`.

### Step 5: Upload and Publish
1. Go back to Partner Center > **Submissions**.
2. Under **Packages**, upload the `.appx` or `.msix` file from `dist-store/`.
3. Fill in store details:
   - Category: **Productivity > Web Browsers**
   - Pricing: Free
   - Upload screenshots and descriptions.
4. Click **Submit to the Store**. Certification usually takes 24–48 hours.

---

## 🎨 Store Visual Assets Checklist
All required visual assets have been auto-generated with the new 2D squircle Ocal branding:
- `build/appx/StoreLogo.png` (50×50)
- `build/appx/Square44x44Logo.png` (44×44)
- `build/appx/Square150x150Logo.png` (150×150)
- `build/appx/Wide310x150Logo.png` (310×150)
- `build/appx/Square310x310Logo.png` (310×310)
- `build/appx/badgeLogo.png` (24×24)
