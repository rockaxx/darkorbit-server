$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -property installationPath
$compiler = Join-Path $vs 'MSBuild/Current/Bin/Roslyn/csc.exe'
$output = Join-Path $root '.local/PetKamikazePolicyTest.exe'
& $compiler /nologo /target:exe /out:$output `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/PetKamikazePolicy.cs') `
    (Join-Path $root 'test/PetKamikazePolicyTest.cs')
if ($LASTEXITCODE -ne 0) { throw 'PET Kamikaze policy test compilation failed.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'PET Kamikaze policy test failed.' }

$pet = Get-Content (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Pet.cs') -Raw
foreach ($needle in @('CheckKamikaze()', 'PetGearTypeModule.KAMIKAZE', 'AttackTypeModule.KAMIKAZE', 'Deactivate(true, true)', 'Settings.Cooldowns["pet_kamikaze"]')) {
    if ($pet -notmatch [regex]::Escape($needle)) { throw "PET integration missing: $needle" }
}
Write-Host 'PASS: PET Kamikaze integrated into game tick and gear menu.'
