$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe'
$output = Join-Path $root '.local/ShieldDamagePolicyTest.exe'
& $compiler /nologo /out:$output `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/ShieldDamagePolicy.cs') `
    (Join-Path $root 'test/ShieldDamagePolicyTest.cs')
if ($LASTEXITCODE -ne 0) { throw 'Shield damage policy test compilation failed.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'Shield damage policy test failed.' }
