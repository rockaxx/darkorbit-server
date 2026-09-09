$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -property installationPath
if (!$vs) { throw 'Visual Studio Build Tools with C# compiler is required.' }
$compiler = Join-Path $vs 'MSBuild/Current/Bin/Roslyn/csc.exe'
$output = Join-Path $root '.local/EnvironmentConfigTest.exe'
& $compiler /nologo "/out:$output" "$root/DarkOrbit 10.0/Utils/EnvironmentConfig.cs" "$PSScriptRoot/EnvironmentConfigTest.cs"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $output
exit $LASTEXITCODE
