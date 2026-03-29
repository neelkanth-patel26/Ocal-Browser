$token = $env:GH_TOKEN
$owner = "neelkanth-patel26"
$repo = "Ocal-Browser"
$tag = "v2.6.78-beta"

$releaseData = Get-Content "release_info.json" -Raw | ConvertFrom-Json

$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github.v3+json"
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
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Method Post -Headers $headers -Body (ConvertTo-Json $releaseData) -ContentType "application/json"
        $releaseId = $release.id
        Write-Output "New release created. ID: $releaseId"
    }
    
    # Artifacts to upload
    $artifacts = @(
        "dist-inno/Ocal-2.6.78-beta-Setup.exe"
    )

    foreach ($file in $artifacts) {
        if (Test-Path $file) {
            $fileName = Split-Path $file -Leaf
            
            # Check if asset already exists and delete it to allow overwrite
            $existingAsset = $release.assets | Where-Object { $_.name -eq $fileName }
            if ($existingAsset) {
                Write-Output "Deleting existing asset: $fileName (ID: $($existingAsset.id))"
                try {
                    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/assets/$($existingAsset.id)" -Method Delete -Headers $headers
                } catch {
                    Write-Warning "Could not delete $($fileName): $($_.Exception.Message)"
                }
            }

            $uploadUri = "https://uploads.github.com/repos/$owner/$repo/releases/$releaseId/assets?name=$fileName"
            Write-Output "Uploading $fileName..."
            
            $fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $file))
            
            Invoke-RestMethod -Uri $uploadUri -Method Post -Headers $headers -Body $fileBytes -ContentType "application/octet-stream"
            Write-Output "Successfully uploaded $fileName"
        } else {
            Write-Warning "File not found: $file"
        }
    }
    Write-Output "Deployment completed successfully!"
} catch {
    Write-Error "Failed to manage release or upload assets: $($_.Exception.Message)"
    exit 1
}
