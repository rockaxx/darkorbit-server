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
Write-Host 'DarkOrbit web UI installed. Refresh the browser to see the update.'
