$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$testDir = Join-Path $root '.local/tests'
New-Item -ItemType Directory -Force $testDir | Out-Null
$output = Join-Path $testDir 'GameplayExpansionTest.exe'
$framework = "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319"
$compiler = Join-Path $framework 'csc.exe'
& $compiler /nologo /target:exe /out:$output `
    (Join-Path $root 'DarkOrbit 10.0/Game/Events/DuelPolicy.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/PetDamagePolicy.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/AmmunitionManager.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/LaserAmmunitionPolicy.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/RocketEffectPolicy.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/AmmunitionVisibilityPolicy.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/EliteBoosterPolicy.cs') `
    (Join-Path $PSScriptRoot 'GameplayExpansionTest.cs')
if ($LASTEXITCODE -ne 0) { throw 'Gameplay expansion policy compilation failed.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'Gameplay expansion policy failed.' }

$duel = Get-Content -Raw (Join-Path $root 'DarkOrbit 10.0/Game/Events/Duel.cs')
$pet = Get-Content -Raw (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Pet.cs')
$attack = Get-Content -Raw (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/AttackManager.cs')
$settings = Get-Content -Raw (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/SettingsManager.cs')
$cpu = Get-Content -Raw (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/CpuManager.cs')
$petHandler = Get-Content -Raw (Join-Path $root 'DarkOrbit 10.0/Net/netty/handlers/PetRequestHandlers/PetRequestHandler.cs')
if ($duel -notmatch 'RecordDuelResult') { throw '1v1 wins are not persisted.' }
if ($duel -notmatch 'try[\s\S]{0,300}RecordDuelResult[\s\S]{0,300}catch') { throw 'Leaderboard failure can interrupt duel cleanup.' }
if ($duel -match 'arenaBoundary|ClampArena|SetPosition\(new Position\(clamped') { throw '1v1 still contains the custom POI or movement clamp.' }
if ($pet -match 'Damage\s*=\s*0') { throw 'PET damage can still be permanently zeroed.' }
if ($pet -notmatch 'GetSelectedLaser\(\),\s*false,\s*true') { throw 'PET does not use the thick laser visual.' }
if ($attack -notmatch 'LaserAmmunitionPolicy\.GetShieldRestore\(Player\.Damage,\s*AmmunitionManager\.CBO_100\)') { throw 'CBO runtime does not use the configured shield restore policy.' }
if ($settings -notmatch 'AmmunitionManager\.CBR') { throw 'CBR football ammunition is not visible.' }
if ($settings -notmatch 'CpuManager\.AIM_CPU') { throw 'AIM CPU is not visible.' }
if ($cpu -notmatch 'AIM_CPU') { throw 'AIM CPU has no server behavior.' }
if ($petHandler -notmatch 'CanUsePet') { throw 'PET activation is not explicitly permitted by duel policy.' }
Write-Host 'PASS: gameplay expansion integrations.'
