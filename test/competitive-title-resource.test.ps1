$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$resource = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1/spacemap/templates/en/resource_achievement.xml').Content
$expected = @{
    'title_achievement_competitive-best-player' = 'Best Player'
    'title_achievement_competitive-second-player' = '2nd Best Player'
    'title_achievement_competitive-third-player' = '3rd Best Player'
}
foreach ($entry in $expected.GetEnumerator()) {
    $item = '<item name="' + $entry.Key + '"><![CDATA[' + $entry.Value + ']]></item>'
    if (!$resource.Contains($item)) { throw "Achievement title resource is missing: $($entry.Key)" }
}
$language = (Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1/spacemap/templates/language_en.xml').Content
$manifestMatch = [regex]::Match($language, '<file[^>]+id="resource_achievement"[^>]+hash="([0-9a-f]{32})"')
if (!$manifestMatch.Success) { throw 'Language manifest has no valid resource_achievement entry.' }
$actualHash = (Get-FileHash -LiteralPath (Join-Path $root '.local/cms/spacemap/templates/en/resource_achievement.xml') -Algorithm MD5).Hash.ToLowerInvariant()
if ($manifestMatch.Groups[1].Value -ne $actualHash) { throw 'Language manifest contains a stale resource_achievement hash.' }
Write-Host 'PASS: competitive achievement title resources are served to the Flash client.'
