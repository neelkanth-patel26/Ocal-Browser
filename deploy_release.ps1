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

$token = $Token
$owner = "neelkanth-patel26"
$repo = "Ocal-Browser"

$releaseData = Get-Content "release_info.json" -Raw | ConvertFrom-Json
$tag = $releaseData.tag_name
$version = (Get-Content package.json | ConvertFrom-Json).version

$headers = @{
    Authorization = "token $token"
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

    Add-Type -AssemblyName System.Net.Http

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
            Write-Output "Uploading $fileName ($([math]::Round((Get-Item $file).Length / 1MB, 2)) MB)..."
            
            $handler = New-Object System.Net.Http.HttpClientHandler
            $client = New-Object System.Net.Http.HttpClient($handler)
            $client.Timeout = [TimeSpan]::FromMinutes(15)
            $client.DefaultRequestHeaders.Add("Authorization", "token $token")
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
            } finally {
                $fileStream.Dispose()
                $client.Dispose()
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
