$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -property installationPath
$compiler = Join-Path $vs 'MSBuild/Current/Bin/Roslyn/csc.exe'
$output = Join-Path $root '.local/GameplayReliabilityTest.exe'
$sources = @(
    (Join-Path $root 'DarkOrbit 10.0/Game/Ticks/Tick.cs'),
    (Join-Path $root 'DarkOrbit 10.0/Game/Ticks/TickManager.cs'),
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/PlayerKillLog.cs'),
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/RepairBotPolicy.cs'),
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/DroneFormationPolicy.cs'),
    (Join-Path $root 'DarkOrbit 10.0/Game/Events/UbaMatchState.cs'),
    (Join-Path $PSScriptRoot 'GameplayReliabilityTest.cs')
)
& $compiler /nologo "/out:$output" $sources
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $output
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$php = Join-Path $root '.local/php/php.exe'
& $php (Join-Path $PSScriptRoot 'player-kill-log-db.test.php')
exit $LASTEXITCODE
