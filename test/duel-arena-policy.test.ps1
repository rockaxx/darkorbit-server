$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$source = Join-Path $root 'DarkOrbit 10.0/Game/Events/DuelPolicy.cs'
$test = Join-Path $PSScriptRoot 'DuelPolicyTest.cs'
$output = Join-Path $root '.local/tests/DuelPolicyTest.exe'
New-Item -ItemType Directory -Force (Split-Path $output) | Out-Null

$csc = Get-ChildItem 'C:/Program Files/Microsoft Visual Studio' -Recurse -Filter csc.exe -ErrorAction SilentlyContinue |
    Where-Object FullName -match 'Roslyn' | Select-Object -First 1 -ExpandProperty FullName
if (!$csc) { throw 'C# compiler not found.' }
& $csc /nologo /target:exe "/out:$output" $source $test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $output
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$duel = Get-Content -LiteralPath (Join-Path $root 'DarkOrbit 10.0/Game/Events/Duel.cs') -Raw
$socket = Get-Content -LiteralPath (Join-Path $root 'DarkOrbit 10.0/Net/SocketServer.cs') -Raw
if ($duel -notmatch 'TryCreate') { throw 'Duel creation is not validated.' }
if ($duel -notmatch 'ReturnLocations') { throw 'Duel players cannot return to their original locations.' }
if ($duel -notmatch 'AvailableArenaMaps') { throw 'Concurrent matches lack isolated arena allocation.' }
if ($socket -notmatch 'StartDuel') { throw 'CMS cannot start an accepted duel.' }
Write-Host 'PASS: 1v1 duel lifecycle integrated.'
