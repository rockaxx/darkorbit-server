$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. "$root/scripts/runtime-config.ps1"

function Assert-Equal($expected, $actual, $message) {
    if ($expected -ne $actual) { throw "$message`: expected '$expected', got '$actual'" }
}

$savedGamePort = $env:DO_GAME_PORT
$savedWsPort = $env:DO_WS_PORT
try {
    Remove-Item Env:DO_GAME_PORT -ErrorAction SilentlyContinue
    Remove-Item Env:DO_WS_PORT -ErrorAction SilentlyContinue
    $defaults = Get-DarkOrbitRuntimeConfig -Root $root
    Assert-Equal 18080 $defaults.GamePort 'default internal game port'
    Assert-Equal 8081 $defaults.WebSocketPort 'default WebSocket port'
    Assert-Equal (Join-Path $root '.local') $defaults.LocalPath 'local path'
    if (!(Test-Path -LiteralPath $defaults.NodePath -PathType Leaf)) { throw 'Node executable did not resolve' }

    $env:DO_GAME_PORT = '19080'
    $env:DO_WS_PORT = '19081'
    $custom = Get-DarkOrbitRuntimeConfig -Root $root
    Assert-Equal 19080 $custom.GamePort 'custom internal game port'
    Assert-Equal 19081 $custom.WebSocketPort 'custom WebSocket port'

    $env:DO_GAME_PORT = 'bad'
    try {
        Get-DarkOrbitRuntimeConfig -Root $root | Out-Null
        throw 'invalid game port was accepted'
    } catch {
        if ($_.Exception.Message -notmatch 'DO_GAME_PORT') { throw }
    }

    $fixture = Join-Path $root '.local/runtime-config-test'
    New-Item -ItemType Directory -Path $fixture -Force | Out-Null
    $source = Join-Path $fixture 'Server.cs'
    $binary = Join-Path $fixture 'Server.exe'
    Set-Content -LiteralPath $source -Value 'class Server {}'
    if (!(Test-DarkOrbitBuildRequired -SourceRoot $fixture -Executable $binary)) { throw 'missing executable must require build' }
    Set-Content -LiteralPath $binary -Value 'binary'
    (Get-Item $source).LastWriteTimeUtc = [DateTime]::UtcNow.AddMinutes(-2)
    (Get-Item $binary).LastWriteTimeUtc = [DateTime]::UtcNow.AddMinutes(-1)
    if (Test-DarkOrbitBuildRequired -SourceRoot $fixture -Executable $binary) { throw 'newer executable must skip build' }
    (Get-Item $source).LastWriteTimeUtc = [DateTime]::UtcNow
    if (!(Test-DarkOrbitBuildRequired -SourceRoot $fixture -Executable $binary)) { throw 'newer source must require build' }
    Remove-Item -LiteralPath $source,$binary -Force
    Remove-Item -LiteralPath $fixture -Force
} finally {
    if ($null -eq $savedGamePort) { Remove-Item Env:DO_GAME_PORT -ErrorAction SilentlyContinue } else { $env:DO_GAME_PORT = $savedGamePort }
    if ($null -eq $savedWsPort) { Remove-Item Env:DO_WS_PORT -ErrorAction SilentlyContinue } else { $env:DO_WS_PORT = $savedWsPort }
}

Write-Output 'PASS: PowerShell runtime configuration.'
