# Nickname 1v1 Arena Design

## Goal

Add a usable 1v1 invitation flow around the original Flash game: invite an online pilot by nickname, accept or decline in-game, enter an isolated arena, fight, then return safely.

## User flow

- A fixed `1v1 Arena` button overlays the map page without modifying the SWF.
- The sender enters an exact pilot nickname and sends an invitation.
- The recipient sees the sender name plus Accept and Decline controls within one second.
- Invitations expire after 60 seconds. Self invites, offline targets, duplicates, and busy players are rejected.
- Accepting starts the duel only if both players are still online and available.
- Players jump to opposite sides of one free arena map from IDs 101 through 111.
- A 25-second no-attack countdown runs before combat.
- Destruction or disconnect ends the duel. The connected participants return to their pre-duel map and position with full HP and shields.
- Duel kills grant no normal PvP reward and create no pushing record, matching existing duel behavior.

## Architecture

- `arena-ui.js` and `arena-ui.css` provide an HTML overlay above the Flash object and call a same-origin endpoint.
- `arena-api.php` stores short-lived invitations in MariaDB and asks the emulator to start accepted matches.
- `SocketServer` is the authority for online/busy validation and calls `Duel.TryCreate`.
- `Duel` owns arena allocation, countdown, opponent filtering, cleanup, and return locations.
- Startup migration creates the invite table. Web UI installation copies/injects the arena assets durably.

## Safety and concurrency

- Prepared SQL statements are required for nicknames and invitation IDs.
- Only the invited user may accept or decline a pending invitation.
- Conditional status updates prevent double acceptance.
- A static concurrent arena allocation set prevents matches sharing a map.
- Cleanup is idempotent so death/disconnect races cannot finish a match twice.
