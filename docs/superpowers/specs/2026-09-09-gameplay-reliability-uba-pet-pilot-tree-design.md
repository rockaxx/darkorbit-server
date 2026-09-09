# Gameplay Reliability, UBA, PET, and Pilot Tree Design

## Scope and priorities

Implement the requested DarkOrbit 10 changes in this order:

1. Prevent a player death from stopping the global game tick loop.
2. Make the ship repair bot start automatically after combat.
3. Remove Ring, Drill, and Wheel drone formations from the client-facing offer and reject them on the server.
4. Complete the existing two-player UBA flow, including matchmaking acceptance and return to the original map.
5. Add PET kamikaze with area damage and cooldown.
6. Repair the Pilot Tree card and icon layout on desktop and mobile.

The work applies to `DarkOrbit 10.0` and the portable CMS in `web/cms`. Existing unrelated working-tree changes must remain intact.

## Death handling and tick-loop resilience

The observed freeze is caused by the player-kill insert omitting the mandatory `log_player_kills.pushing` column. MariaDB rejects the insert in strict mode, and the exception escapes the active player's tick into `TickManager`, whose single outer catch ends the global loop. Once that happens, all tick-driven mechanics stop together.

The kill log must write `killer_id`, `target_id`, and `pushing` explicitly. `pushing` is true when the existing repeated-kill rule suppresses the reward, and false otherwise. Database logging remains part of the death operation, but a logging failure must not permanently stop world simulation.

`TickManager` must isolate each tick invocation. An exception from one `Tick` is logged with the failing tick type and the manager continues processing later ticks and later frames. Iteration must tolerate ticks being added or removed during callbacks. This is defense in depth; it does not replace fixing the invalid SQL.

Regression coverage must demonstrate both that the live schema accepts the produced kill-log data and that a failing tick does not prevent a later healthy tick from running.

## Automatic ship repair bot

The existing repair bot remains the only HP repair implementation. When a living player has less than maximum HP, it starts automatically ten seconds after the player's last combat activity. It repairs once per second using the existing base rate, booster, and Engineering bonuses. It remains off during combat and turns off immediately when the player reaches full HP. It must not heal a destroyed player.

The repair visual/beacon state must change only when activation actually changes, avoiding redundant network updates every tick.

## Disabled drone formations

The disabled loot IDs are:

- `drone_formation_f-3d-rg` (Ring / Kruh)
- `drone_formation_f-3d-dr` (Drill / Vŕtačka)
- `drone_formation_f-3d-wl` (Wheel / Koleso)

They must be absent from the formation category sent to the client. The server-side formation change entry point must use an allowlist and reject any value outside the enabled formation set, including direct forged requests. If a saved account contains a removed or otherwise invalid formation, login normalizes it to `drone_formation_default` before status and formation commands are sent and persists that normalized setting through the existing settings save path.

Existing effect branches may remain for compatibility with old data, but no live player can select or retain a disabled formation.

## UBA 1vs1 lifecycle

### Matchmaking

The global UBA manager owns a thread-safe waiting queue. A player may queue only when connected, alive, outside another Duel or Jackpot event, and not already waiting or in a UBA match. Cancel removes the player and resets the UBA window state.

When two eligible players are available, the manager removes them from the queue atomically and creates one pending match. Both players receive the existing acceptance/countdown UI. Each acceptance handler marks only its own participant accepted. The match starts only if both accept before the five-second deadline. A cancellation, timeout, disconnect, death, or ineligibility during acceptance cancels the pending match for both players and clears all UBA state.

### Arena and combat

Before moving players, the match stores each player's original map ID and a copy of the original position. Cloak and active attacks are disabled. The players jump to map 121 at the two existing spawn positions. During the opening countdown they remain protected; after it expires, the spawn protection POIs are removed for both clients and combat becomes active.

One `Uba` instance owns the state transition and tick lifecycle. Repeated callbacks must be idempotent so a death and disconnect arriving close together cannot finish a match twice.

### Completion and return

The first destroyed or disconnected participant loses and the connected opponent wins. The match closes its UI, clears attacks and temporary arena state, removes arena-only mines, and unregisters its tick. No normal player-kill reward, cargo box, or pushing-log side effect is awarded for a UBA result.

Each connected participant is restored to the exact map and position captured before matchmaking. A destroyed participant is restored to a playable state before the return, with full hit points and shields and without a normal kill screen. A disconnected participant's saved map and position are restored so the next login occurs outside map 121. All queue, acceptance, and match references are cleared on every exit path.

Automated state-transition tests cover queueing, acceptance by both players, timeout/cancel, winner selection, disconnect, single completion, and original-location restoration.

## PET kamikaze

The PET initialization advertises Kamikaze gear in addition to Passive and Guard. Selecting Kamikaze activates it only when the PET is active, alive, off cooldown, and has at least one valid hostile target within 450 units.

Activation deals 75,000 raw damage to every valid hostile attackable character within a radius of 450 around the PET. The owner, the PET itself, group members, clan allies, friendly/non-attackable players, and other invalid targets are excluded through the same hostility rules used by normal player attacks. Each affected target receives the appropriate kamikaze attack visual/hit update and standard damage processing so destruction and rewards remain consistent.

After the explosion the PET is destroyed through its normal PET destruction path and Kamikaze receives a 60-second server-authoritative cooldown. Repeated or forged activation requests during cooldown cause no damage. The owner receives a cooldown update suitable for the PET UI. The cooldown is based on server time and cannot be reset by toggling or reactivating the PET.

Tests cover target filtering, multiple targets, radius boundary, exact damage, PET destruction, and blocked repeat activation.

## Pilot Tree layout

The root cause is a collision between the legacy skill-tree sprite CSS and the new responsive grid: legacy skill IDs apply `top` and `left` offsets while the new cards expect normal flow. The skill icon still uses the legacy sprite and state frame, but card layout must neutralize legacy offsets and constrain the icon to its card.

Scoped `orbit-ui` CSS resets `top`, `left`, margins, positioning, and overflow only inside `.orbit-skill-grid`. Every skill card has a stable minimum height, a centered 74-by-85-pixel sprite, and a label below it. The grid grows to contain every skill; research usage and reset controls remain after the grid instead of overlapping it. On mobile the grid uses two columns without horizontal page overflow.

Browser verification must assert that every skill icon rectangle is contained by its own card, cards do not overlap, all sprite assets load, the research footer begins below the grid, and desktop/mobile pages have no horizontal overflow.

## Verification

Completion requires fresh evidence from:

- focused red/green regression tests for tick resilience, repair delay, formation validation, UBA state transitions, and kamikaze behavior;
- a successful full DarkOrbit server compilation using `scripts/build.ps1`;
- database-backed verification of the kill-log insert under the current strict MariaDB schema;
- the browser UI verification suite with the new Pilot Tree geometry assertions at desktop and mobile sizes;
- a controlled server restart followed by inspection of the new error log and a gameplay smoke test where practical.

