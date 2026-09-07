param([switch]$NoClient)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$local = Join-Path $root '.local'
$secrets = Get-Content "$local/credentials.json" -Raw | ConvertFrom-Json
function Start-LocalProcess($name, $exe, $arguments, $workingDirectory, [switch]$Visible) {
    $pidFile = Join-Path $local "$name.pid"
    if (Test-Path $pidFile) {
        $existing = Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue
        if ($existing -and $existing.Path -eq [IO.Path]::GetFullPath($exe)) { return }
    }
    $options = @{ FilePath=$exe; WorkingDirectory=$workingDirectory; PassThru=$true }
    if ($arguments) { $options.ArgumentList=$arguments }
    if (!$Visible) {
        $options.WindowStyle='Hidden'
        $options.RedirectStandardOutput=Join-Path $local "logs/$name.out.log"
        $options.RedirectStandardError=Join-Path $local "logs/$name.err.log"
    }
    $process = Start-Process @options
    $process.Id | Set-Content $pidFile
}
function Wait-LocalPort($port, $name) {
    for ($attempt=0; $attempt -lt 60; $attempt++) {
        $tcp = New-Object Net.Sockets.TcpClient
        try { $tcp.Connect('127.0.0.1', $port); return } catch { Start-Sleep -Milliseconds 500 } finally { $tcp.Dispose() }
    }
    throw "$name did not start on port $port. See .local/logs."
}
Start-LocalProcess 'db' "$local/mariadb-10.11.16-winx64/bin/mariadbd.exe" @('--defaults-file="'+$local+'/db/my.ini"','--console') $local
Wait-LocalPort 3307 'MariaDB'
$env:DO_DB_PORT='3307'
$env:DO_DB_NAME='darkorbit_local'
$env:DO_DB_PASSWORD=$secrets.dbPassword
$env:DO_BIND_ADDRESS='127.0.0.1'
if (!(Test-Path "$local/emulator/DarkOrbit.exe")) { & "$PSScriptRoot/build.ps1" }
Start-LocalProcess 'emulator' "$local/emulator/DarkOrbit.exe" @() "$local/emulator"
foreach ($port in @(8080,9338,4301)) { Wait-LocalPort $port 'Emulator' }
Start-LocalProcess 'web80' "$local/php/php.exe" @('-S','127.0.0.1:80','-t',('"'+$local+'/cms"'),('"'+$PSScriptRoot+'/router.php"')) "$local/cms"
Wait-LocalPort 80 'Web login'
if (!$NoClient) { Start-LocalProcess 'client' "$local/electron/electron.exe" ('"'+$PSScriptRoot+'/client.js"') $root -Visible }
Write-Host 'DarkOrbit 10 is running: http://127.0.0.1/'
Write-Host ('Account: ' + $secrets.username)
Write-Host 'Credentials: .local/credentials.json'
