$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$local = Join-Path $root '.local'
foreach ($entry in @(@('client','electron/electron.exe'),@('emulator','emulator/DarkOrbit.exe'),@('web80','php/php.exe'),@('web','php/php.exe'))) {
    $pidFile = Join-Path $local ($entry[0] + '.pid')
    if (!(Test-Path $pidFile)) { continue }
    $process = Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue
    $expected = [IO.Path]::GetFullPath((Join-Path $local $entry[1]))
    if ($process -and $process.Path -eq $expected) {
        if ($entry[0] -eq 'client') {
            $null = $process.CloseMainWindow()
            $null = $process.WaitForExit(5000)
            Start-Sleep -Seconds 1
        }
        if (!$process.HasExited) { Stop-Process -Id $process.Id }
    }
}
if (Test-Path "$local/db.pid") {
    $db = Get-Process -Id ([int](Get-Content "$local/db.pid")) -ErrorAction SilentlyContinue
    if ($db -and $db.Path -eq [IO.Path]::GetFullPath("$local/mariadb-10.11.16-winx64/bin/mariadbd.exe")) {
        & "$local/mariadb-10.11.16-winx64/bin/mariadb-admin.exe" "--defaults-extra-file=$local/db-client.ini" shutdown
        if ($LASTEXITCODE -ne 0) { throw 'Database shutdown failed.' }
    }
}
Write-Host 'Local DarkOrbit stopped.'
