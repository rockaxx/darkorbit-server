$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$installer = Join-Path $root 'scripts/apply-web-ui.ps1'
$mapPath = Join-Path $root '.local/cms/files/external/map_revolution.php'

& $installer

$map = [IO.File]::ReadAllText($mapPath)
if (!$map.Contains('css/arena-ui.css') -or !$map.Contains('js/arena-ui.js')) {
    throw 'Arena overlay assets were not installed.'
}
if ($map -notmatch '\$player\[''version''\].*\?.*1.*:.*2') {
    throw 'Arena map does not select display mode from the player setting.'
}
Write-Host 'PASS: web UI installer applies the arena overlay.'
