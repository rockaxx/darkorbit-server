$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$settings = Get-Content (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/SettingsManager.cs') -Raw

if ($settings -notmatch 'EnsureZoomBindings\s*\(') { throw 'Existing accounts do not receive zoom binding migration.' }
if ($settings -notmatch 'ZOOM_IN[^\r\n]+107[^\r\n]+187') { throw 'Zoom-in must support numpad + and regular +.' }
if ($settings -notmatch 'ZOOM_OUT[^\r\n]+109[^\r\n]+189') { throw 'Zoom-out must support numpad - and regular -.' }

Write-Host 'PASS: 2D zoom bindings cover regular and numpad +/-.'
