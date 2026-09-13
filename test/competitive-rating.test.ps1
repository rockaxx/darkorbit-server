$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$testDir = Join-Path $root '.local/tests'
New-Item -ItemType Directory -Force $testDir | Out-Null
$output = Join-Path $testDir 'CompetitiveRatingTest.exe'
$framework = "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319"
$compiler = Join-Path $framework 'csc.exe'
& $compiler /nologo /target:exe /out:$output `
    (Join-Path $root 'DarkOrbit 10.0/Game/Events/CompetitiveRatingPolicy.cs') `
    (Join-Path $PSScriptRoot 'CompetitiveRatingTest.cs')
if ($LASTEXITCODE -ne 0) { throw 'Competitive rating policy compilation failed as expected only before implementation.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'Competitive rating policy failed.' }
