function Get-DarkOrbitPort([string]$Name, [int]$Default) {
    $raw = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($raw)) { return $Default }
    $port = 0
    if (![int]::TryParse($raw, [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
        throw "$Name must be an integer between 1 and 65535."
    }
    return $port
}

function Get-DarkOrbitRuntimeConfig([string]$Root) {
    $node = Get-Command node -ErrorAction Stop
    [pscustomobject]@{
        LocalPath = Join-Path $Root '.local'
        NodePath = $node.Source
        GamePort = Get-DarkOrbitPort 'DO_GAME_PORT' 18080
        WebSocketPort = Get-DarkOrbitPort 'DO_WS_PORT' 8081
    }
}

function Test-DarkOrbitBuildRequired([string]$SourceRoot, [string]$Executable) {
    if (!(Test-Path -LiteralPath $Executable -PathType Leaf)) { return $true }
    $builtAt = (Get-Item -LiteralPath $Executable).LastWriteTimeUtc
    return [bool](Get-ChildItem -LiteralPath $SourceRoot -Recurse -Filter *.cs | Where-Object {
        $_.LastWriteTimeUtc -gt $builtAt
    } | Select-Object -First 1)
}
