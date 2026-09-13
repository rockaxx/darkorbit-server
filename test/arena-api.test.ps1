$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$api = Join-Path $root 'web/cms/arena-api.php'
$migration = Join-Path $root 'scripts/apply-elite-defaults.php'
$installer = Join-Path $root 'scripts/apply-web-ui.ps1'

if (!(Test-Path $api)) { throw 'Arena API missing.' }
$lint = & (Join-Path $root '.local/php/php.exe') -l $api 2>&1
if ($LASTEXITCODE -ne 0) { throw "Arena API invalid PHP: $lint" }
$apiSource = Get-Content -LiteralPath $api -Raw
$migrationSource = Get-Content -LiteralPath $migration -Raw
$installerSource = Get-Content -LiteralPath $installer -Raw
foreach ($action in @('invite','poll','accept','decline','leaderboard','competitive_search','competitive_poll','competitive_cancel','competitive_leaderboard')) {
    if ($apiSource -notmatch "'$action'") { throw "Arena API action missing: $action" }
}
if ($apiSource -notmatch 'prepare\(') { throw 'Arena API must use prepared statements.' }
if ($apiSource -notmatch 'CanStartDuel' -or $apiSource -notmatch 'StartDuel') { throw 'Arena API lacks emulator validation/start.' }
if ($migrationSource -notmatch 'CREATE TABLE IF NOT EXISTS player_duel_invites') { throw 'Arena invite migration missing.' }
if ($migrationSource -notmatch 'expiresAt') { throw 'Arena invitations do not expire.' }
if ($migrationSource -notmatch 'CREATE TABLE IF NOT EXISTS player_duel_stats') { throw 'Arena leaderboard schema missing.' }
if ($migrationSource -notmatch 'CREATE TABLE IF NOT EXISTS player_competitive_stats') { throw 'Competitive Elo schema missing.' }
if ($migrationSource -notmatch 'CREATE TABLE IF NOT EXISTS player_competitive_queue') { throw 'Competitive queue schema missing.' }
if ($migrationSource -notmatch 'CREATE TABLE IF NOT EXISTS player_competitive_matches') { throw 'Competitive match schema missing.' }
if ($apiSource -notmatch 'wins' -or $apiSource -notmatch 'losses') { throw 'Arena leaderboard does not expose results.' }
if ($apiSource -notmatch 'StartCompetitiveDuel') { throw 'Competitive matchmaking cannot start an Elo duel.' }
if ($installerSource -notmatch "'web/cms'") { throw 'Arena API installation is not durable.' }
Write-Host 'PASS: authenticated 1v1 invitation API and schema.'
