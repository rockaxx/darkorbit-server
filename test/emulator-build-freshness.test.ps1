$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. "$root/scripts/runtime-config.ps1"

$sourceRoot = Join-Path $root 'DarkOrbit 10.0'
$executable = Join-Path $root '.local/emulator/DarkOrbit.exe'

if (Test-DarkOrbitBuildRequired -SourceRoot $sourceRoot -Executable $executable) {
    throw 'Deployed emulator is missing or older than its C# sources.'
}

Write-Output 'PASS: deployed emulator matches current C# sources.'
