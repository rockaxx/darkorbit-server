$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$stdout = Join-Path $root '.local/logs/game-close-test.out.log'
$stderr = Join-Path $root '.local/logs/game-close-test.err.log'
$process = Start-Process -FilePath (Join-Path $root '.local/electron/electron.exe') `
    -ArgumentList ('"' + (Join-Path $PSScriptRoot 'game-close.electron.js') + '"') `
    -WorkingDirectory $root -WindowStyle Hidden -Wait -PassThru `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr
Get-Content -LiteralPath $stdout
Get-Content -LiteralPath $stderr
if ($process.ExitCode -ne 0) { throw 'Electron game close regression failed.' }
