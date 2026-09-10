$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$publicClient = Get-Content (Join-Path $root 'scripts/public-client.js') -Raw
$buildClient = Get-Content (Join-Path $root 'scripts/build-client.ps1') -Raw
$router = Get-Content (Join-Path $root 'scripts/router.php') -Raw
$package = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json

foreach ($needle in @('ppapi-flash-path', 'pepflashplayer.dll', 'startTransport')) {
    if ($publicClient -notmatch [regex]::Escape($needle)) { throw "Original Flash client missing: $needle" }
}
foreach ($needle in @('pepflashplayer.dll', 'client-transport.js', 'flash-display-mode.js', 'Start-Client.ps1')) {
    if ($buildClient -notmatch [regex]::Escape($needle)) { throw "Client package missing: $needle" }
}
if ($router -match 'native-client|browser-runtime') { throw 'Server router still loads replacement JS/native client.' }
if ($package.dependencies.PSObject.Properties.Name -contains '@ruffle-rs/ruffle') { throw 'Ruffle dependency still installed.' }

$forbidden = @(
    'scripts/native-client.php', 'scripts/extract-native-ships.js', 'scripts/verify-native.js',
    'web/native', 'test/native-protocol.test.js', 'test/NativeWireFixtures.cs'
)
foreach ($item in $forbidden) {
    if (Test-Path (Join-Path $root $item)) { throw "Replacement JS/native client still exists: $item" }
}

Write-Host 'Original Flash client architecture OK.'
