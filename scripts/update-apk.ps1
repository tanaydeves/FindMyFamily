param (
    [string]$TargetApk = "FindMyFamily.apk"
)

$ErrorActionPreference = "Stop"

Write-Host "Updating assets inside $TargetApk..."

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$apkFullPath = (Resolve-Path $TargetApk).Path
$zip = [System.IO.Compression.ZipFile]::Open($apkFullPath, [System.IO.Compression.ZipArchiveMode]::Update)

try {
    # Find and delete existing web assets inside assets/public/ and config JSONs
    $entriesToRemove = @($zip.Entries | Where-Object { 
        $_.FullName -like "assets/public/*" -or 
        $_.FullName -eq "assets/capacitor.config.json" -or 
        $_.FullName -eq "assets/capacitor.plugins.json" 
    })
    Write-Host "Removing $($entriesToRemove.Count) old asset entries from APK..."
    foreach ($entry in $entriesToRemove) {
        $entry.Delete()
    }

    # Add updated files from android/app/src/main/assets
    $baseDir = (Resolve-Path "android/app/src/main/assets").Path
    $files = Get-ChildItem -Path $baseDir -Recurse -File
    Write-Host "Adding $($files.Count) fresh asset files to APK..."
    foreach ($file in $files) {
        $relPath = $file.FullName.Substring($baseDir.Length + 1).Replace('\', '/')
        $zipPath = "assets/" + $relPath
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }

    Write-Host "Successfully packaged fresh assets into $TargetApk"
}
finally {
    $zip.Dispose()
}

# Sign and zipalign the APK so Android will accept it without "Package is invalid"
$signerJar = Join-Path $PSScriptRoot "uber-apk-signer.jar"
if (-not (Test-Path $signerJar)) {
    Write-Host "Downloading uber-apk-signer.jar..."
    curl.exe -s -L -o $signerJar "https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar"
}

if (Test-Path $signerJar) {
    Write-Host "Signing and aligning APK with Android debug key (v1, v2, v3)..."
    java -jar $signerJar -a $apkFullPath --allowResign --overwrite
    if ($LASTEXITCODE -ne 0) {
        throw "APK signing failed with exit code $LASTEXITCODE"
    }
    Write-Host "APK signed and verified successfully!"
} else {
    Write-Warning "uber-apk-signer.jar not found at $signerJar - APK may be unsigned"
}


