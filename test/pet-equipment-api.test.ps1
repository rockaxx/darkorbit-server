$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$api = Join-Path $root 'web/cms/pet-equipment-api.php'
$page = Join-Path $root 'web/cms/files/external/equipment.php'
$script = Join-Path $root 'web/cms/js/pet-equipment.js'
$style = Join-Path $root 'web/cms/css/pet-equipment.css'

foreach ($path in @($api, $page, $script, $style)) {
    if (!(Test-Path -LiteralPath $path)) { throw "PET Hangar component missing: $path" }
}

$php = Join-Path $root '.local/php/php.exe'
$lint = & $php -l $api 2>&1
if ($LASTEXITCODE -ne 0) { throw "PET equipment API invalid PHP: $lint" }

$sessionId = 'petapi' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
$pilot = 'pet_api_' + [Guid]::NewGuid().ToString('N').Substring(0, 10)
$createSession = @"
session_id('$sessionId'); chdir('.local/cms'); require_once('files/config.php');
`$db=Database::GetInstance();
`$s=`$db->prepare('INSERT INTO player_accounts (sessionId,username,pilotName,email,password,info,verification) VALUES (?,?,?,?,?,\'{}\',\'{"verified":true}\')');
`$email='$pilot@example.test'; `$password='unused'; `$s->bind_param('sssss',`$sid,`$name,`$name,`$email,`$password); `$sid='$sessionId'; `$name='$pilot'; `$s->execute();
`$id=(int)`$db->insert_id; `$db->query('INSERT INTO player_equipment (userId) VALUES ('.`$id.')');
`$_SESSION['account']=['id'=>`$id,'session'=>'$sessionId']; session_write_close(); echo `$id;
"@
$userId = & $php -r $createSession
if ($LASTEXITCODE -ne 0) { throw 'Could not create PET API test session.' }

try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1/pet-equipment-api.php' -Method Post -Headers @{ Cookie = "PHPSESSID=$sessionId" } -Body @{ action='status' }
    if (!$response.status) { throw "PET status failed: $($response.message)" }
    foreach ($config in @($response.configs.'1', $response.configs.'2')) {
        if ($config.laserCapacity -ne 6 -or $config.shieldCapacity -ne 12) { throw 'PET capacities are wrong.' }
        if ($null -eq $config.lasers -or $null -eq $config.shields) { throw 'PET equipment arrays are missing.' }
    }
    $cleared = Invoke-RestMethod -Uri 'http://127.0.0.1/pet-equipment-api.php' -Method Post -Headers @{ Cookie = "PHPSESSID=$sessionId" } -Body @{ action='clear'; config=1; type='laser' }
    if ($cleared.configs.'1'.lasers.Count -ne 0) { throw 'PET lasers were not cleared.' }
    $added = Invoke-RestMethod -Uri 'http://127.0.0.1/pet-equipment-api.php' -Method Post -Headers @{ Cookie = "PHPSESSID=$sessionId" } -Body @{ action='add'; config=1; type='laser' }
    if ($added.configs.'1'.lasers.Count -ne 1) { throw 'One PET laser was not equipped.' }
    $fullLasers = Invoke-RestMethod -Uri 'http://127.0.0.1/pet-equipment-api.php' -Method Post -Headers @{ Cookie = "PHPSESSID=$sessionId" } -Body @{ action='equipAll'; config=1; type='laser' }
    if ($fullLasers.configs.'1'.lasers.Count -ne 6) { throw 'All PET laser slots were not equipped.' }
    $fullShields = Invoke-RestMethod -Uri 'http://127.0.0.1/pet-equipment-api.php' -Method Post -Headers @{ Cookie = "PHPSESSID=$sessionId" } -Body @{ action='equipAll'; config=1; type='shield' }
    if ($fullShields.configs.'1'.shields.Count -ne 12) { throw 'All PET shield slots were not equipped.' }
    Write-Host 'PASS: authenticated PET Hangar equipment API and UI assets.'
} finally {
    & $php -r "session_id('$sessionId'); session_start(); session_destroy(); chdir('.local/cms'); require_once('files/config.php'); `$db=Database::GetInstance(); `$db->query('DELETE FROM player_equipment WHERE userId='.(int)$userId); `$db->query('DELETE FROM player_accounts WHERE userId='.(int)$userId);"
}
