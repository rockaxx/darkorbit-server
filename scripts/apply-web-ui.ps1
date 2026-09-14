$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$source = Join-Path $projectRoot 'web/cms'
$destination = Join-Path $projectRoot '.local/cms'
if (!(Test-Path -LiteralPath (Join-Path $destination 'files/config.php'))) {
    throw 'Install the local CMS first. See LOCAL-SETUP.md.'
}
# Keep original files once so local installation changes remain recoverable.
$backup = Join-Path $projectRoot '.local/ui-originals'
foreach ($file in Get-ChildItem -LiteralPath $source -Recurse -File) {
    $relative = $file.FullName.Substring($source.Length + 1)
    $target = Join-Path $destination $relative
    $saved = Join-Path $backup $relative
    if ((Test-Path -LiteralPath $target) -and !(Test-Path -LiteralPath $saved)) {
        New-Item -ItemType Directory -Force -Path (Split-Path $saved -Parent) | Out-Null
        Copy-Item -LiteralPath $target -Destination $saved
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $target -Force
}

$functionsPath = Join-Path $destination 'files/classes/Functions.php'
$functions = [IO.File]::ReadAllText($functionsPath)
$functions = $functions.Replace("'verified' => false", "'verified' => true")
$functions = $functions.Replace("You successfully registered, please verify your e-mail address.", "You successfully registered. You can log in now.")
$functions = [Text.RegularExpressions.Regex]::Replace(
    $functions,
    '(?m)^\s*SMTP::SendMail\(\$email, \$username, ''E-mail verification''.*\r?\n',
    ''
)
$changeVersion = @'
  public static function ChangeVersion($version) {
    if ($version !== 'false' && $version !== 'true') {
      return json_encode(['status' => false, 'message' => 'Invalid display mode.']);
    }

    try {
      $mysqli = Database::GetInstance();
      $userId = (int)Functions::GetPlayer()['userId'];
      $enabled = $version === 'true' ? 1 : 0;
      $statement = $mysqli->prepare('UPDATE player_accounts SET version = ? WHERE userId = ?');
      $statement->bind_param('ii', $enabled, $userId);
      $statement->execute();
      return json_encode([
        'status' => true,
        'mode' => $enabled ? '3D' : '2D',
        'message' => 'Display mode saved. Reload the Game tab.'
      ]);
    } catch (Throwable $e) {
      return json_encode(['status' => false, 'message' => 'Display mode could not be saved.']);
    }
  }

	public static function GetLevel
'@
$functions = [Text.RegularExpressions.Regex]::Replace(
    $functions,
    '(?s)  public static function ChangeVersion\(\$version\) \{.*?\r?\n  \}\r?\n\r?\n\tpublic static function GetLevel',
    $changeVersion
)
if (!$functions.Contains("'verified' => true") -or !$functions.Contains('You can log in now.') -or
    $functions.Contains("SMTP::SendMail(`$email, `$username, 'E-mail verification'") -or
    !$functions.Contains("'mode' => `$enabled ? '3D' : '2D'")) {
    throw 'Could not apply CMS registration/display-mode fixes.'
}
[IO.File]::WriteAllText($functionsPath, $functions, [Text.UTF8Encoding]::new($false))

foreach ($relativePath in @(
    'flashinput/translationEquipment.php',
    'flashinput/translationGalaxygates.php',
    'swf_global/flashinput/getMainNavRes.php'
)) {
    $xmlPath = Join-Path $destination $relativePath
    $xml = [IO.File]::ReadAllText($xmlPath)
    if ($xml.StartsWith('<?xml')) {
        $xml = [Text.RegularExpressions.Regex]::Replace(
            $xml,
            '\A<\?xml[^?]*\?>',
            '<?php echo ''<?xml version="1.0" encoding="UTF-8"?>''; ?>'
        )
        [IO.File]::WriteAllText($xmlPath, $xml, [Text.UTF8Encoding]::new($false))
    }
}

$inventoryPath = Join-Path $destination 'flashAPI/inventory.php'
$inventory = [IO.File]::ReadAllText($inventoryPath)
if (!$inventory.Contains('EliteUpgradeLevel')) {
    $inventory = $inventory.Replace(
        '$mysqli = Database::GetInstance();',
        "`$mysqli = Database::GetInstance();`r`ndefine('EliteUpgradeLevel', 16);"
    )
}
$inventory = $inventory.Replace(
    'function GetDroneLevelsInformation($amount = 8)',
    'function GetDroneLevelsInformation($amount = 16)'
)
$inventory = $inventory.Replace(
    '$item = array("I" => $i, "LV" => 0, "L" => $item_id, "S" => $i);',
    '$upgradeLevel = ($item_id == 0 || $item_id == 8) ? EliteUpgradeLevel : 0;' + "`r`n`t`t" + '$item = array("I" => $i, "LV" => $upgradeLevel, "L" => $item_id, "S" => $i);'
)
$inventory = $inventory.Replace(
    '$drone = ["I" => $i, "L" => $item_id, "LV" => 5, "HP" => "0%",',
    '$drone = ["I" => $i, "L" => $item_id, "LV" => EliteUpgradeLevel, "HP" => "0%",'
)
# Keep the legacy Flash payload limited to the ship/drone schema it supports.
# PET equipment is managed by the HTML panel installed from web/cms instead.
$inventory = [Text.RegularExpressions.Regex]::Replace(
    $inventory,
    '(?m)^[^\r\n]*"pet": \{"EQ"[^\r\n]*\r?\n',
    ''
)
$inventory = [Text.RegularExpressions.Regex]::Replace(
    $inventory,
    '(?m)^[^\r\n]*"pet": \{"L": 22, "PN"[^\r\n]*\r?\n',
    ''
)
$inventory = $inventory.Replace(
    "in_array(`$json_array['from']['target'], ['ship','pet'], true) && `$json_array['to']['target'] == 'inventory'",
    "`$json_array['from']['target'] == 'ship' && `$json_array['to']['target'] == 'inventory'"
)
$inventory = [Text.RegularExpressions.Regex]::Replace($inventory, '(?m)^[^\r\n]*\$sourcePrefix = [^\r\n]*\r?\n', '')
$inventory = $inventory.Replace(
    "`$toType = 'config'.`$json_array['to']['configId'].'_'.`$sourcePrefix.`$json_array['from']['slotset'];",
    "`$toType = 'config'.`$json_array['to']['configId'].'_'.`$json_array['from']['slotset'].'';"
)
$inventory = $inventory.Replace(
    "`$json_array['from']['target'] == 'inventory' && in_array(`$json_array['to']['target'], ['ship','pet'], true)",
    "`$json_array['from']['target'] == 'inventory' && `$json_array['to']['target'] == 'ship'"
)
$inventory = [Text.RegularExpressions.Regex]::Replace($inventory, '(?m)^[^\r\n]*\$targetPrefix = [^\r\n]*\r?\n', '')
$inventory = $inventory.Replace(
    "`$toType = 'config'.`$json_array['to']['configId'].'_'.`$targetPrefix.`$json_array['to']['slotset'];",
    "`$toType = 'config'.`$json_array['to']['configId'].'_'.`$json_array['to']['slotset'].'';"
)
$inventory = $inventory.Replace(
    "`$max_item = `$json_array['to']['target'] == 'pet' ? (`$json_array['to']['slotset'] == 'lasers' ? 6 : 12) : `$currentShip[`$json_array['to']['slotset']];",
    "`$max_item = `$currentShip[`$json_array['to']['slotset']];"
)
$petLaserClear = @'
, config".$json_array['configID']."_pet_lasers = '[]'
'@.Trim()
$petGeneratorClear = @'
, config".$json_array['configID']."_pet_generators = '[]'
'@.Trim()
$inventory = $inventory.Replace($petLaserClear, '').Replace($petGeneratorClear, '')
if (!$inventory.Contains('array_fill(0, EliteUpgradeLevel + 1')) {
    $levelFunction = @'
function GetCurrentItemLevelsInformation()
{
	$level = '
	{
		"selling": {
		"credits": 0
		},
		"cdn": {
		"30x30": "ea805e03b2d3fa173b723f1f846bc900",
		"63x63": "768dea8b4af9ee7381b707cc63f3ac00",
		"100x100": "6f332bdc590ad65c8095d1c303cebf00"
		}
	}';
	return implode(',', array_fill(0, EliteUpgradeLevel + 1, $level));
}

function GetDroneLevelsInformation
'@
    $inventory = [Text.RegularExpressions.Regex]::Replace(
        $inventory,
        'function GetCurrentItemLevelsInformation\(\)[\s\S]*?function GetDroneLevelsInformation',
        $levelFunction,
        1
    )
}
if (!$inventory.Contains('"LV" => $upgradeLevel') -or
    !$inventory.Contains('"LV" => EliteUpgradeLevel') -or
    !$inventory.Contains('array_fill(0, EliteUpgradeLevel + 1') -or
    $inventory.Contains('"pet": {"EQ"') -or
    $inventory.Contains('"pet": {"L": 22') -or
    $inventory.Contains("['ship','pet']") -or
    $inventory.Contains('$sourcePrefix') -or
    $inventory.Contains('$targetPrefix') -or
    $inventory.Contains('_pet_lasers = ''[]''')) {
    throw 'Could not apply Hangar level-16 equipment patch.'
}
[IO.File]::WriteAllText($inventoryPath, $inventory, [Text.UTF8Encoding]::new($false))

$mapPath = Join-Path $destination 'files/external/map_revolution.php'
$map = [IO.File]::ReadAllText($mapPath)
$map = $map.Replace(
    '"display2d": "2"',
    '"display2d": "<?php echo (int)$player[''version''] ? 1 : 2; ?>"'
)
if (!$map.Contains('css/arena-ui.css')) {
    $map = $map.Replace('</head>', '    <link rel="stylesheet" href="<?php echo DOMAIN; ?>css/arena-ui.css">' + "`r`n</head>")
}
if (!$map.Contains('js/arena-ui.js')) {
    $map = $map.Replace('</body>', '  <script src="<?php echo DOMAIN; ?>js/arena-ui.js"></script>' + "`r`n</body>")
}
$hasDynamicDisplayMode = [Text.RegularExpressions.Regex]::IsMatch(
    $map,
    '\$player\[''version''\].*\?.*[''"]?1[''"]?.*:.*[''"]?2[''"]?'
)
if (!$map.Contains('css/arena-ui.css') -or !$map.Contains('js/arena-ui.js') -or !$hasDynamicDisplayMode) {
    throw 'Could not install the 1v1 Arena overlay.'
}
[IO.File]::WriteAllText($mapPath, $map, [Text.UTF8Encoding]::new($false))
Write-Host 'DarkOrbit web UI installed. Refresh the browser to see the update.'
