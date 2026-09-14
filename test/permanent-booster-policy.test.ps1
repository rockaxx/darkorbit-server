$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$testDir = Join-Path $root '.local/tests'
New-Item -ItemType Directory -Force $testDir | Out-Null
$output = Join-Path $testDir 'PermanentBoosterPolicyTest.exe'
$compiler = Join-Path "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319" 'csc.exe'
& $compiler /nologo /target:exe /out:$output `
    (Join-Path $root 'DarkOrbit 10.0/Game/Enums.cs') `
    (Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/PermanentBoosterPolicy.cs') `
    (Join-Path $PSScriptRoot 'PermanentBoosterPolicyTest.cs')
if ($LASTEXITCODE -ne 0) { throw 'Permanent booster policy compilation failed.' }
& $output
if ($LASTEXITCODE -ne 0) { throw 'Permanent booster policy failed.' }

$manager = [IO.File]::ReadAllText((Join-Path $root 'DarkOrbit 10.0/Game/Objects/Players/Managers/BoosterManager.cs'))
$starter = [IO.File]::ReadAllText((Join-Path $root 'scripts/starter-profile.php'))
if ($manager -notmatch 'EnsureAllPermanentBoosters') { throw 'Existing players do not receive all permanent boosters.' }
if ($manager -notmatch 'MaximumPercentage\(boostedAttributeType\)') { throw 'Runtime booster totals do not enforce the 20 percent damage cap.' }
foreach ($type in 0..26) {
    if ($starter -notmatch "'Type'\s*=>\s*$type(?:\D|$)") { throw "Starter profile is missing booster type $type." }
}
Write-Host 'PASS: all permanent boosters are installed for existing and new players.'
