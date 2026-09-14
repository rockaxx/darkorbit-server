$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe'
$output = Join-Path $root '.local/GalaxyGateBadgePolicyTest.exe'
& $compiler /nologo /out:$output `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/GalaxyGateBadgePolicy.cs') `
    (Join-Path $root 'test/GalaxyGateBadgePolicyTest.cs')
if ($LASTEXITCODE -ne 0) { throw 'Galaxy Gate badge policy test compilation failed.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'Galaxy Gate badge policy test failed.' }
