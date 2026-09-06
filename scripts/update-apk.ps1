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
