$ErrorActionPreference = "Stop"

$token = "REMOVED_TOKEN"
$owner = "neelkanth-patel26"
$repo = "Ocal-Browser"
$releaseId = "356069594"

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

$body = @{
    body = @"
## 🌟 Ocal Browser v7.9.00 Stable - Mega Update

### ✨ New Features & UI Enhancements
* **500% Volume Booster**: Integrated an advanced volume boosting extension allowing users to safely amplify media up to 500% directly within the browser.
* **Intelligent Sidebar Theming**: Redesigned the sidebar social panel to be simple and perfectly match the selected theme mode. No more black-outs or jarring theme transitions when opening side panels.
* **Refined Aesthetics**: Removed the distracting zoom-in scaling effect on the top navigation and address bar buttons, keeping the UI interactions incredibly simple, responsive, and professional.
* **Improved UI Controls**: Fixed and improved the cross (close) button alignment and interactions in the sidebar UI for a cleaner UX.

### 🐛 Bug Fixes & Reliability
* **Native In-App PDF Printing**: Fixed an issue where the PDF print button generated blank PDFs or inappropriately opened third-party browsers (like Opera). Printing is now handled completely natively inside Ocal Browser.
* **PDF Print Preview Support**: Fixed a complex issue where printing a PDF resulted in a blank OS preview dialog. The custom PDF viewer now intelligently converts WebGL/HTML5 `<canvas>` elements into standard images right before the print spooler intercepts the document.
* **Print Dialog App Identity**: Fixed an OS integration issue where the native print dialog would incorrectly display "Electron" instead of "Ocal Browser". The application identity is now explicitly registered at the Windows system level.

### 🛠 Architecture & Build System
* **Premium Installer Automation**: Fully updated the build pipeline to compile the custom `Ocal-7.9.00-Setup.exe` with Inno Setup, maintaining small artifact sizes while injecting custom icons seamlessly.
"@
} | ConvertTo-Json

Write-Host "Updating GitHub Release Catalog..."
Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$releaseId" -Method Patch -Headers $headers -Body $body -ContentType "application/json" | Out-Null
Write-Host "Release catalog updated successfully!"
