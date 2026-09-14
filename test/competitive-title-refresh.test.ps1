$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$credentials = Get-Content (Join-Path $root '.local/credentials.json') -Raw | ConvertFrom-Json
$database = Join-Path $root '.local/mariadb-10.11.16-winx64/bin/mariadb.exe'
$query = @'
SELECT COUNT(*)
FROM (
    SELECT userId,
           CASE ROW_NUMBER() OVER (ORDER BY elo DESC,wins DESC,losses ASC,updatedAt ASC,userId ASC)
               WHEN 1 THEN 'Best Player'
               WHEN 2 THEN '2nd Best Player'
               WHEN 3 THEN '3rd Best Player'
           END AS expectedTitle
    FROM player_competitive_stats
) ranked
JOIN player_accounts accounts ON accounts.userId=ranked.userId
WHERE ranked.expectedTitle IS NOT NULL AND accounts.title<>ranked.expectedTitle;
'@
$incorrect = & $database '--host=127.0.0.1' '--port=3307' '--user=root' `
    ('--password=' + $credentials.dbPassword) '--database=darkorbit_local' `
    '--batch' '--skip-column-names' ('--execute=' + $query)
if ($LASTEXITCODE -ne 0) { throw 'Competitive title database verification failed.' }
if ([int]$incorrect -ne 0) { throw "$incorrect competitive leaderboard titles are not assigned in player accounts." }
Write-Host 'PASS: competitive leaderboard titles are assigned in player accounts.'
