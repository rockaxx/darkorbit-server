$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$username = 'ui_' + ([Guid]::NewGuid().ToString('N').Substring(0, 10))
$email = "$username@example.test"
$password = 'TestPass123!'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
    $register = Invoke-RestMethod -Uri 'http://127.0.0.1/api/' -Method Post -WebSession $session -Body @{
        action = 'register'
        username = $username
        email = $email
        password = $password
        password_confirm = $password
    }
    if ($register.message -notmatch 'successfully registered') {
        throw "Registration failed: $($register.message)"
    }

    $login = Invoke-RestMethod -Uri 'http://127.0.0.1/api/' -Method Post -WebSession $session -Body @{
        action = 'login'
        username = $username
        password = $password
    }
    if (!$login.status) {
        throw "Fresh account cannot log in without e-mail click: $($login.message)"
    }

    $map = Invoke-WebRequest -Uri 'http://127.0.0.1/map-revolution' -WebSession $session -UseBasicParsing
    if ($map.Content -notmatch 'spacemap/preloader\.swf') {
        throw 'Logged-in map does not embed original Flash preloader.'
    }
    if ($map.Content -match '/browser/native|native-client') {
        throw 'Logged-in map still contains replacement JS/native client.'
    }

    Write-Output 'PASS: fresh account logs in immediately and receives original Flash map.'
} finally {
    & "$root/.local/php/php.exe" "$root/scripts/cleanup-ui-test.php" $username
}
