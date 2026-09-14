$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe'
$output = Join-Path $root '.local/HonorRankPolicyTest.exe'
& $compiler /nologo /out:$output `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/HonorRankPolicy.cs') `
    (Join-Path $root 'test/HonorRankPolicyTest.cs')
if ($LASTEXITCODE -ne 0) { throw 'Honor rank policy test compilation failed.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'Honor rank policy test failed.' }

$program = Get-Content (Join-Path $root 'DarkOrbit 10.0/Program.cs') -Raw
$player = Get-Content (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Player.cs') -Raw
$queries = Get-Content (Join-Path $root 'DarkOrbit 10.0/Managers/QueryManager.cs') -Raw
if ($program -notmatch 'RecalculateHonorRanks') { throw 'Honor ranks are not recalculated at server startup.' }
if ($player -notmatch 'RecalculateHonorRanks') { throw 'Honor ranks are not recalculated after honor changes.' }
if ($queries -notmatch 'JSON_EXTRACT\(data') { throw 'Honor rank query does not read honor from account data.' }
if ($queries -notmatch 'UPDATE player_accounts SET rankId') { throw 'Calculated honor ranks are not persisted.' }
