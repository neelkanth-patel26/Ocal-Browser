$ErrorActionPreference = "Stop"

$token = "REMOVED_TOKEN"
$owner = "neelkanth-patel26"
$repo = "Ocal-Browser"
$version = "v7.9.00"

$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

$body = @{
    tag_name = $version
    name = "Ocal Browser 7.9.00 Stable"
    body = @"
## Detail Catalog - v7.9.00 Stable

### 🐛 Bug Fixes & Improvements
* **Print Dialog App Name**: Fixed an issue where the OS print dialog would display "Electron" instead of "Ocal Browser". The application name is now explicitly registered at the system level before the window initializes.
* **PDF Print Preview Support**: Resolved an issue where printing a PDF resulted in a blank preview and blank printed pages. The PDF viewer now intelligently converts WebGL/HTML5 `<canvas>` elements into standard images right before the print spooler intercepts the document, providing full support for the Windows native print dialog preview.
* **Native In-App Printing**: Refactored the print flow to trigger the native OS print dialog directly inside Ocal Browser without relying on or opening third-party external applications (e.g., Opera or Edge).
* **Installer Enhancements**: Updated the Inno Setup compilation pipeline to properly inject the custom `AppVersion` and output filenames for this release.
"@
    draft = $false
    prerelease = $false
} | ConvertTo-Json

Write-Host "Creating GitHub Release..."
$releaseResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Method Post -Headers $headers -Body $body -ContentType "application/json"

$releaseId = $releaseResponse.id
$uploadUrl = $releaseResponse.upload_url -replace '\{\?name,label\}', '?name=Ocal-7.9.00-Setup.exe'

Write-Host "Created Release ID: $releaseId"
Write-Host "Uploading Asset to: $uploadUrl"

$filePath = "D:\Brower\dist-inno\Ocal-7.9.00-Setup.exe"

# We must use curl.exe for large file uploads on Windows as Invoke-RestMethod can sometimes struggle with 100MB+ binary streams or memory issues.
& curl.exe -sL -X POST -H "Authorization: token $token" -H "Content-Type: application/octet-stream" --data-binary "@$filePath" $uploadUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host "Upload completed successfully!"
} else {
    Write-Host "Upload failed with exit code $LASTEXITCODE"
}
