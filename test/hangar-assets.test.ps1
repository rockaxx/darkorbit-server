$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$php = Join-Path $root '.local/php/php.exe'
$assets = @(
    '.local/cms/flashinput/translationEquipment.php',
    '.local/cms/flashinput/translationGalaxygates.php',
    '.local/cms/swf_global/flashinput/getMainNavRes.php'
)
foreach ($relative in $assets) {
    $file = Join-Path $root $relative
    $lint = & $php -l $file 2>&1
    if ($LASTEXITCODE -ne 0) { throw "$relative is invalid PHP: $lint" }
    $output = & $php $file
    if (($output -join "`n") -notmatch '^\s*<\?xml') { throw "$relative does not output XML." }
}
$inventory = Join-Path $root '.local/cms/swf_global/inventory/inventory.swf'
if (!(Test-Path $inventory) -or (Get-Item $inventory).Length -lt 100000) { throw 'Inventory SWF missing.' }
Write-Host 'PASS: Hangar Flash/XML assets load.'
