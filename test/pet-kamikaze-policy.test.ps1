$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -property installationPath
$compiler = Join-Path $vs 'MSBuild/Current/Bin/Roslyn/csc.exe'
$output = Join-Path $root '.local/PetKamikazePolicyTest.exe'
& $compiler /nologo /target:exe /out:$output `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/PetKamikazePolicy.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/PetVisibilityPolicy.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Utils/Bytes.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Net/netty/commands/PetVisibilityCommand.cs') `
    (Join-Path $root 'test/PetKamikazePolicyTest.cs')
if ($LASTEXITCODE -ne 0) { throw 'PET Kamikaze policy test compilation failed.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'PET Kamikaze policy test failed.' }

$pet = Get-Content (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Pet.cs') -Raw
foreach ($needle in @('CheckKamikaze()', 'PetGearTypeModule.KAMIKAZE', 'AttackTypeModule.KAMIKAZE', 'Deactivate(true, true)', 'Settings.Cooldowns["pet_kamikaze"]')) {
    if ($pet -notmatch [regex]::Escape($needle)) { throw "PET integration missing: $needle" }
}
foreach ($needle in @('ShouldPursue', 'ShouldDetonate', 'Movement.Move(this, kamikazeTarget.Position)', 'ActivationHitpoints')) {
    if ($pet -notmatch [regex]::Escape($needle)) { throw "PET pursuit integration missing: $needle" }
}
$spacemap = Get-Content (Join-Path $root 'DarkOrbit 10.0/Game/Spacemap.cs') -Raw
if ($pet -notmatch 'SynchronizeVisibility') { throw 'PET activation does not synchronize its map visibility.' }
if ($spacemap -notmatch 'SynchronizeVisibility') { throw 'Map jumps do not synchronize already active PETs.' }
$visibilityCommandPath = Join-Path $root 'DarkOrbit 10.0/Net/netty/commands/PetVisibilityCommand.cs'
if (-not (Test-Path $visibilityCommandPath)) { throw 'Binary PET visibility command is missing.' }
$visibilityCommand = Get-Content $visibilityCommandPath -Raw
foreach ($needle in @('ID = 4390', 'writeShort(-30289)', 'writeShort(-5379)', 'petId << 11 | petId >> 21', 'writeBoolean(isInvisible)')) {
    if ($visibilityCommand -notmatch [regex]::Escape($needle)) { throw "PET visibility command encoding missing: $needle" }
}
if ($pet -notmatch 'PetVisibilityCommand\.write\(Id, Invisible\)') {
    throw 'PET synchronization does not send the binary visibility command.'
}
Write-Host 'PASS: PET Kamikaze integrated into game tick and gear menu.'
