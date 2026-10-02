param (
    [string]$Token = $env:GH_TOKEN
)

if (-not $Token -and (Test-Path ".env")) {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*(?:GH_TOKEN|GITHUB_TOKEN)\s*=\s*(.+?)\s*$') {
            $Token = $matches[1].Trim('"').Trim("'")
        }
    }
}

$owner = "neelkanth-patel26"
$repo = "Ocal-Browser"

$releaseData = Get-Content "release_info.json" -Raw | ConvertFrom-Json
$tag = $releaseData.tag_name
$version = (Get-Content package.json | ConvertFrom-Json).version

$headers = @{
    Authorization = "token $Token"
    Accept = "application/vnd.github.v3+json"
    "User-Agent" = "Ocal-Release-Bot"
}

# Find or Create Release
try {
    Write-Output "Checking for existing release $tag..."
    $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Method Get -Headers $headers
    $release = $releases | Where-Object { $_.tag_name -eq $tag }
    
    if ($release) {
        $releaseId = $release.id
        Write-Output "Existing release found. ID: $releaseId"
        # Fetch full release data to get all assets
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$releaseId" -Method Get -Headers $headers
    } else {
        Write-Output "Creating new release..."
        $rawJson = [System.IO.File]::ReadAllText("release_info.json", [System.Text.Encoding]::UTF8)
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Method Post -Headers $headers -Body $rawJson -ContentType "application/json; charset=utf-8"
        $releaseId = $release.id
        Write-Output "New release created. ID: $releaseId"
    }
    
    # Artifacts to upload
    $artifacts = @(
        "dist-inno/Ocal-$version-Setup.exe"
    )

    $storeFiles = Get-ChildItem "dist-store\*.appx", "dist-store\*.msix", "dist-store\*.exe" -ErrorAction SilentlyContinue
    if ($storeFiles) {
        foreach ($sf in $storeFiles) {
            $artifacts += $sf.FullName
        }
    }

    Add-Type -AssemblyName System.Net.Http

    foreach ($file in $artifacts) {
        if (Test-Path $file) {
            $fileName = Split-Path $file -Leaf
            
            # Check if asset already exists (GitHub may normalize spaces to dots) and delete it to allow overwrite
            $dotName = $fileName.Replace(' ', '.')
            $existingAssets = $release.assets | Where-Object { $_.name -eq $fileName -or $_.name -eq $dotName }
            if ($existingAssets) {
                foreach ($ea in $existingAssets) {
                    Write-Output "Deleting existing asset: $($ea.name) (ID: $($ea.id))"
                    try {
                        Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/assets/$($ea.id)" -Method Delete -Headers $headers
                        Start-Sleep -Seconds 2
                    } catch {
                        Write-Warning "Could not delete $($ea.name): $($_.Exception.Message)"
                    }
                }
            }

            $encodedName = [Uri]::EscapeDataString($fileName)
            $uploadUri = "https://uploads.github.com/repos/$owner/$repo/releases/$releaseId/assets?name=$encodedName"
            Write-Output "Uploading $fileName ($([math]::Round((Get-Item $file).Length / 1MB, 2)) MB)..."
            
            $maxRetries = 3
            for ($attempt = 1; $attempt -le $maxRetries; $attempt++) {
                try {
                    $handler = New-Object System.Net.Http.HttpClientHandler
                    $client = New-Object System.Net.Http.HttpClient($handler)
                    $client.Timeout = [TimeSpan]::FromMinutes(20)
                    $client.DefaultRequestHeaders.Add("Authorization", "token $Token")
                    $client.DefaultRequestHeaders.Add("User-Agent", "Ocal-Release-Bot")
                    $client.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json")

                    $fullPath = (Resolve-Path $file).Path
                    $fileStream = [System.IO.File]::OpenRead($fullPath)
                    try {
                        $content = New-Object System.Net.Http.StreamContent($fileStream)
                        $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/octet-stream")
                        
                        $response = $client.PostAsync($uploadUri, $content).GetAwaiter().GetResult()
                        $respBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                        
                        if (-not $response.IsSuccessStatusCode) {
                            throw "Upload failed with status $($response.StatusCode): $respBody"
                        }
                        Write-Output "Successfully uploaded $fileName"
                        break
                    } finally {
                        $fileStream.Dispose()
                        $client.Dispose()
                    }
                } catch {
                    Write-Warning "Attempt $attempt failed: $($_.Exception.Message)"
                    if ($attempt -lt $maxRetries) {
                        Write-Output "Retrying in 5 seconds..."
                        Start-Sleep -Seconds 5
                        # Fetch release again in case an orphan asset was left
                        $freshRelease = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$releaseId" -Method Get -Headers $headers
                        $staleAsset = $freshRelease.assets | Where-Object { $_.name -eq $fileName }
                        if ($staleAsset) {
                            try {
                                Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/assets/$($staleAsset.id)" -Method Delete -Headers $headers
                                Start-Sleep -Seconds 2
                            } catch {}
                        }
                    } else {
                        throw "All $maxRetries upload attempts failed for $fileName."
                    }
                }
            }
        } else {
            Write-Warning "File not found: $file"
        }
    }
    Write-Output "Deployment completed successfully!"
} catch {
    Write-Error "Failed to manage release or upload assets: $($_.Exception.Message)"
    exit 1
}
