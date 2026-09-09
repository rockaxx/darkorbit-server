$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -property installationPath
$compiler = Join-Path $vs 'MSBuild/Current/Bin/Roslyn/csc.exe'
$output = Join-Path $root '.local/NativeWireFixtures.exe'
$names = @('ShipInitializationCommand','ShipCreateCommand','PetHeroActivationCommand','CreatePortalCommand','AttackHitCommand','MoveCommand','VisualModifierCommand','ClanRelationModule','class_11d','AttackTypeModule')
$sources = $names | ForEach-Object { "$root/DarkOrbit 10.0/Net/netty/commands/$_.cs" }
& $compiler /nologo "/out:$output" "/reference:$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319/System.Net.Http.dll" "$root/DarkOrbit 10.0/Utils/Bytes.cs" "$PSScriptRoot/NativeWireFixtures.cs" @sources
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $output
exit $LASTEXITCODE
