$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$source = Join-Path $projectRoot 'web/cms'
$destination = Join-Path $projectRoot '.local/cms'
if (!(Test-Path -LiteralPath (Join-Path $destination 'files/config.php'))) {
    throw 'Install the local CMS first. See LOCAL-SETUP.md.'
}
# Keep original files once so local installation changes remain recoverable.
$backup = Join-Path $projectRoot '.local/ui-originals'
foreach ($file in Get-ChildItem -LiteralPath $source -Recurse -File) {
    $relative = $file.FullName.Substring($source.Length + 1)
    $target = Join-Path $destination $relative
    $saved = Join-Path $backup $relative
    if ((Test-Path -LiteralPath $target) -and !(Test-Path -LiteralPath $saved)) {
        New-Item -ItemType Directory -Force -Path (Split-Path $saved -Parent) | Out-Null
        Copy-Item -LiteralPath $target -Destination $saved
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $target -Force
}
Write-Host 'DarkOrbit web UI installed. Refresh the browser to see the update.'
