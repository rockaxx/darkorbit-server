$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$username = 'ui_' + ([Guid]::NewGuid().ToString('N').Substring(0, 10))
$password = 'TestPass123!'
$session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()

function Get-MapHtml {
    (Invoke-WebRequest -Uri 'http://127.0.0.1/map-revolution' -WebSession $session -UseBasicParsing).Content
}

try {
    $null = Invoke-RestMethod -Uri 'http://127.0.0.1/api/' -Method Post -WebSession $session -Body @{
        action='register'; username=$username; email="$username@example.test"; password=$password; password_confirm=$password
    }
    $login = Invoke-RestMethod -Uri 'http://127.0.0.1/api/' -Method Post -WebSession $session -Body @{
        action='login'; username=$username; password=$password
    }
    if (!$login.status) { throw "Login failed: $($login.message)" }
    if ((Get-MapHtml) -notmatch '"display2d":\s*"2"') { throw 'New account must start in 2D.' }

    $to3d = Invoke-RestMethod -Uri 'http://127.0.0.1/api/' -Method Post -WebSession $session -Body @{
        action='change_version'; version='true'
    }
    if (!$to3d.status) { throw "3D switch rejected: $($to3d.message)" }
    if ((Get-MapHtml) -notmatch '"display2d":\s*"1"') { throw '3D mode was not persisted.' }

    $to2d = Invoke-RestMethod -Uri 'http://127.0.0.1/api/' -Method Post -WebSession $session -Body @{
        action='change_version'; version='false'
    }
    if (!$to2d.status) { throw "2D switch rejected: $($to2d.message)" }
    if ((Get-MapHtml) -notmatch '"display2d":\s*"2"') { throw '2D mode was not persisted.' }

    Write-Host 'PASS: display mode persists 2D -> 3D -> 2D.'
} finally {
    & "$root/.local/php/php.exe" "$root/scripts/cleanup-ui-test.php" $username
}
