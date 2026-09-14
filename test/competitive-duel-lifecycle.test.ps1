$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$duel = [IO.File]::ReadAllText((Join-Path $root 'DarkOrbit 10.0/Game/Events/Duel.cs'))
$attackable = [IO.File]::ReadAllText((Join-Path $root 'DarkOrbit 10.0/Game/Objects/Attackable.cs'))
$socket = [IO.File]::ReadAllText((Join-Path $root 'DarkOrbit 10.0/Net/SocketServer.cs'))
$api = [IO.File]::ReadAllText((Join-Path $root 'web/cms/arena-api.php'))

if ($duel -notmatch 'bool HasAvailableArena\(') { throw 'Duel does not expose arena capacity to matchmaking.' }
if ($socket -notmatch 'HasAvailableDuelArena') { throw 'Socket API does not expose duel arena capacity.' }
if ($api -notmatch "Socket::Get\('HasAvailableDuelArena'") { throw 'Competitive matchmaking can pair players while the arena is occupied.' }
if ($duel -notmatch 'bool IsParticipant\(') { throw 'Duel lacks stable participant detection.' }
if ($attackable -notmatch 'Duel\.IsParticipant\((?:player|this as Player)\)') { throw 'Player death still depends on transient map visibility instead of duel participation.' }
if ($duel -notmatch 'player\.Destroyed\s*\|\|\s*player\.GameSession\s*==\s*null') { throw 'Duel tick does not recover destroyed or disconnected participants.' }

Write-Host 'PASS: competitive duel capacity and completion lifecycle are guarded.'
