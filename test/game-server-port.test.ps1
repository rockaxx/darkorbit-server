$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$vswhere = "${env:ProgramFiles(x86)}/Microsoft Visual Studio/Installer/vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -property installationPath
if (!$vs) { throw 'Visual Studio Build Tools with C# compiler is required.' }
$compiler = Join-Path $vs 'MSBuild/Current/Bin/Roslyn/csc.exe'
$framework = "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319"
$output = Join-Path $root '.local/GameServerPortTest.exe'
& $compiler /nologo "/out:$output" "/reference:$framework/System.dll" "/reference:$framework/System.Core.dll" `
    "$root/DarkOrbit 10.0/Utils/EnvironmentConfig.cs" `
    "$root/DarkOrbit 10.0/Net/GameServer.cs" `
    "$PSScriptRoot/GameServerPortTest.cs"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$savedPort = $env:DO_GAME_PORT
try {
    $env:DO_GAME_PORT = '18080'
    & $output
    exit $LASTEXITCODE
} finally {
    if ($null -eq $savedPort) { Remove-Item Env:DO_GAME_PORT -ErrorAction SilentlyContinue }
    else { $env:DO_GAME_PORT = $savedPort }
}
