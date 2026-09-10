$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$stage = Join-Path $root ('.local/client-build-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $stage | Out-Null
Copy-Item (Join-Path $root '.local/electron') (Join-Path $stage 'runtime') -Recurse
Copy-Item (Join-Path $PSScriptRoot 'public-client.js') (Join-Path $stage 'public-client.js')
foreach ($file in @('client-transport.js','flash-display-mode.js','client-port-guard.ps1','Start-Client.ps1','client-tabs.html','client-tabs.js','client-tabs-preload.js')) {
  Copy-Item (Join-Path $PSScriptRoot $file) (Join-Path $stage $file)
}
Copy-Item (Join-Path $root '.local/client/pepflashplayer.dll') (Join-Path $stage 'pepflashplayer.dll')
New-Item -ItemType Directory -Force (Join-Path $stage 'node_modules') | Out-Null
Copy-Item (Join-Path $root 'node_modules/ws') (Join-Path $stage 'node_modules/ws') -Recurse
Set-Content (Join-Path $stage 'server.txt') ((Get-Content (Join-Path $root '.local/public-url.txt')).Trim())
Set-Content (Join-Path $stage 'Start-Client.cmd') @('@echo off', 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Client.ps1"')
$zip = Join-Path $root '.local/cms/downloads/DarkOrbit-Client.zip'
New-Item -ItemType Directory -Force (Split-Path $zip) | Out-Null
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath ($stage + '.zip') -CompressionLevel Fastest
Move-Item -LiteralPath ($stage + '.zip') -Destination $zip -Force
Write-Host "Client balík: $zip"
