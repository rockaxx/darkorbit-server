$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

$starter = Get-Content -LiteralPath (Join-Path $root 'scripts/starter-profile.php') -Raw
$booster = Get-Content -LiteralPath (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/BoosterManager.cs') -Raw
$query = Get-Content -LiteralPath (Join-Path $root 'DarkOrbit 10.0/Managers/QueryManager.cs') -Raw
$installer = Get-Content -LiteralPath (Join-Path $root 'scripts/apply-web-ui.ps1') -Raw
$start = Get-Content -LiteralPath (Join-Path $root 'scripts/start.ps1') -Raw

if ($starter -notmatch "'boosters'\s*=>") { throw 'Starter profile has no permanent boosters.' }
if ($booster -notmatch 'EnsureEliteBoosters') { throw 'Existing accounts do not receive elite boosters.' }
if ($booster -notmatch 'boosters\[k\]\.Seconds\s*<\s*0') { throw 'Permanent boosters would expire.' }
if ($booster -notmatch 'DMGM_1[\s\S]{0,120}percentage\s*=\s*5') { throw 'Damage booster total cannot reach exactly 25%.' }
if ($query -notmatch 'Lf4Level16Damage\s*=\s*212') { throw 'LF-4 level 16 damage is not applied.' }
if ($query -notmatch 'Bo2Level16Shield\s*=\s*15900') { throw 'BO2 level 16 shield is not applied.' }
if ($query -notmatch 'DroneLevel16DamageBonusPercent\s*=\s*16') { throw 'Level-16 drone damage bonus is not applied.' }
if ($query -notmatch 'DroneLevel16ShieldBonusPercent\s*=\s*26') { throw 'Level-16 drone shield bonus is not applied.' }
if ($installer -notmatch 'EliteUpgradeLevel') { throw 'Hangar LV16 patch is not durable.' }
if ($start -notmatch 'apply-elite-defaults\.php') { throw 'Existing/new database accounts are not migrated.' }

if ($starter -notmatch "'petLasers'\s*=>" -or $starter -notmatch "'petShields'\s*=>") { throw 'Starter PET equipment is missing.' }
if ($starter -notmatch 'equipment_extra_cpu_aim-02') { throw 'Starter AIM CPU is missing.' }
if ($starter -notmatch 'ammunition_laser_cbo-100' -or $starter -notmatch 'ammunition_rocketlauncher_cbr') { throw 'Starter CBO/CBR ammunition is missing.' }
if ($installer -match '\$generalPet' -or $installer -match '\$petConfig1') { throw 'Legacy Flash Hangar still receives unsupported PET data.' }
if ($installer -notmatch '\$petLaserClear' -or $installer -notmatch '\$petGeneratorClear') { throw 'Legacy PET clearConfig cleanup is not durable.' }
if ($installer -notmatch 'config1_pet_lasers' -or $installer -notmatch 'pet_generators') { throw 'PET equipment persistence patch is not durable.' }

Write-Host 'PASS: elite LV16 equipment and permanent booster policy.'
