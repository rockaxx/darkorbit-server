# Gameplay Reliability, UBA, PET, and Pilot Tree Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the death-triggered server freeze, automate ship repair, disable three formations, complete UBA 1vs1, add PET kamikaze, and fix the Pilot Tree layout.

**Architecture:** Small policy/state classes hold deterministic behavior that can be tested without sockets or the database, while existing `Player`, `Pet`, `SettingsManager`, and UBA handlers perform game-side effects. The global tick loop isolates callback failures, UBA owns a single idempotent match lifecycle, and scoped CMS CSS keeps legacy sprites without legacy positioning.

**Tech Stack:** C#/.NET Framework 4.6.1, MariaDB 10.11, PHP 7.4, Node.js test runner, Puppeteer, PowerShell build scripts.

**Spec:** `docs/superpowers/specs/2026-09-09-gameplay-reliability-uba-pet-pilot-tree-design.md`

## Global Constraints

- Apply gameplay changes only to `DarkOrbit 10.0`.
- Preserve all unrelated uncommitted files and edits.
- PET kamikaze uses 75,000 damage, radius 450, and a 60,000 ms cooldown.
- Automatic repair starts 10 seconds after combat and ticks once per second.
- Ring, Drill, and Wheel must be absent from the UI and rejected by the server.
- UBA returns players to the exact pre-match map ID and coordinates.
- Every production behavior change follows a witnessed red-green test cycle.

---

### Task 1: Keep the world alive after a player death

**Files:**
- Create: `DarkOrbit 10.0/Game/Objects/Players/PlayerKillLog.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Attackable.cs:270-350`
- Modify: `DarkOrbit 10.0/Game/Ticks/TickManager.cs`
- Create: `test/GameplayReliabilityTest.cs`
- Create: `test/gameplay-reliability.test.ps1`

**Interfaces:**
- Produces: `PlayerKillLog.CreateInsert(int killerId, int targetId, bool pushing): string`
- Produces: `TickManager.RunFrame(): void`, called by the asynchronous loop and callable by the test harness.

- [ ] **Step 1: Write failing regression tests**

Create a C# harness with a throwing `Tick` followed by a counting `Tick`. Assert that `RunFrame()` increments the healthy tick and leaves it registered. Assert the hand-derived SQL string:

```csharp
Assert.Equal(
    "INSERT INTO log_player_kills (killer_id, target_id, pushing) VALUES (7, 9, 1)",
    PlayerKillLog.CreateInsert(7, 9, true));
```

The PowerShell wrapper compiles the harness with the production `TickManager.cs`, `Tick.cs`, and `PlayerKillLog.cs`, supplies a test logger stub, executes it, then opens a database transaction and verifies both pushing values can be inserted into the live strict schema before rolling back.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `powershell -ExecutionPolicy Bypass -File test/gameplay-reliability.test.ps1`

Expected: compilation fails because `PlayerKillLog` and `TickManager.RunFrame` do not exist.

- [ ] **Step 3: Implement the kill-log query boundary**

Implement:

```csharp
internal static class PlayerKillLog
{
    public static string CreateInsert(int killerId, int targetId, bool pushing)
    {
        return $"INSERT INTO log_player_kills (killer_id, target_id, pushing) VALUES ({killerId}, {targetId}, {(pushing ? 1 : 0)})";
    }
}
```

In `Attackable.Destroy`, compute the repeated-kill count once, use it for reward suppression, skip ordinary kill logging/cargo when `player.Storage.Uba != null`, and otherwise execute `PlayerKillLog.CreateInsert(...)` with `pushing: count >= 14`.

- [ ] **Step 4: Isolate each tick callback**

Implement `RunFrame()` over `Ticks.ToArray()`. Wrap each `tick.Tick()` in its own `try/catch`, log the tick type and exception, and leave the outer asynchronous loop running. Make `Tick()` call `RunFrame()` followed by the existing frame delay.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `powershell -ExecutionPolicy Bypass -File test/gameplay-reliability.test.ps1`

Expected: the healthy tick runs after the throwing tick and both database inserts succeed under `STRICT_TRANS_TABLES`.

- [ ] **Step 6: Build the server**

Run: `powershell -ExecutionPolicy Bypass -File scripts/build.ps1`

Expected: exit code 0 and a refreshed `.local/emulator/DarkOrbit.exe`.

### Task 2: Start ship repair automatically ten seconds after combat

**Files:**
- Create: `DarkOrbit 10.0/Game/Objects/Players/Managers/RepairBotPolicy.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Player.cs:94-169`
- Modify: `test/GameplayReliabilityTest.cs`

**Interfaces:**
- Produces: `RepairBotPolicy.CanRepair(bool destroyed, int currentHp, int maxHp, DateTime lastCombat, DateTime now): bool`
- Consumes: existing `Player.Heal(int)` and `Player.RepairBot(bool)`.

- [ ] **Step 1: Add failing repair-policy tests**

Use a fixed `now` and literal expectations for: 9.999 seconds after combat is false; exactly 10 seconds is true; full HP is false; destroyed is false; damaged and out of combat is true.

- [ ] **Step 2: Run and verify RED**

Run: `powershell -ExecutionPolicy Bypass -File test/gameplay-reliability.test.ps1`

Expected: compilation fails because `RepairBotPolicy` does not exist.

- [ ] **Step 3: Implement and integrate the policy**

Implement `CanRepair` with `!destroyed`, `currentHp < maxHp`, and `lastCombat.AddSeconds(10) <= now`. Update `CheckHitpointsRepair()` to deactivate the beacon when policy is false, heal no more frequently than once per second, and activate the beacon only on the false-to-true transition. Clamp through the existing `Heal` behavior and deactivate after reaching max HP.

- [ ] **Step 4: Run tests and build**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File test/gameplay-reliability.test.ps1
powershell -ExecutionPolicy Bypass -File scripts/build.ps1
```

Expected: all focused tests pass and the build exits 0.

### Task 3: Remove and reject Ring, Drill, and Wheel formations

**Files:**
- Create: `DarkOrbit 10.0/Game/Objects/Players/Managers/DroneFormationPolicy.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Players/Managers/DroneManager.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Players/Managers/SettingsManager.cs:444-454`
- Modify: `DarkOrbit 10.0/Net/netty/handlers/LoginRequestHandler.cs:107-118`
- Modify: `test/GameplayReliabilityTest.cs`

**Interfaces:**
- Produces: `DroneFormationPolicy.IsAllowed(string formation): bool`
- Produces: `DroneFormationPolicy.Normalize(string formation): string`
- Consumes: `DroneManager.DEFAULT_FORMATION` and enabled formation constants.

- [ ] **Step 1: Add failing allowlist tests**

Assert Ring, Drill, Wheel, `null`, empty, and an invented loot ID are rejected and normalized to Default. Assert Default, Turtle, and Heart remain unchanged and allowed.

- [ ] **Step 2: Run and verify RED**

Run: `powershell -ExecutionPolicy Bypass -File test/gameplay-reliability.test.ps1`

Expected: compilation fails because `DroneFormationPolicy` does not exist.

- [ ] **Step 3: Implement the allowlist and server enforcement**

Define one `HashSet<string>` containing only enabled formation constants. Remove the three disabled constants from `SettingsManager.FormationsCategory`. At the first line of `ChangeDroneFormation`, return when `IsAllowed(NewFormationID)` is false. Before `SendPlayer` emits formation data, normalize the saved value; if it changes, save `inGameSettings` immediately.

- [ ] **Step 4: Run tests and build**

Run the focused test and `scripts/build.ps1`.

Expected: all tests pass and compilation exits 0.

### Task 4: Complete UBA matchmaking and match lifecycle

**Files:**
- Create: `DarkOrbit 10.0/Game/Events/UbaMatchState.cs`
- Replace incomplete behavior in: `DarkOrbit 10.0/Game/Events/UltimateBattleArena.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Storage.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Attackable.cs`
- Modify: `DarkOrbit 10.0/Game/GameSession.cs`
- Modify: `DarkOrbit 10.0/Net/netty/handlers/UbaRequestHandlers/UbaMatchmakingRequestHandler.cs`
- Modify: `DarkOrbit 10.0/Net/netty/handlers/UbaRequestHandlers/UbaMatchmakingAcceptRequestHandler.cs`
- Modify: `DarkOrbit 10.0/Net/netty/handlers/UbaRequestHandlers/UbaMatchmakingCancelRequestHandler.cs`
- Modify: `test/GameplayReliabilityTest.cs`

**Interfaces:**
- Produces: `UbaMatchState.Accept(int playerId, DateTime now): UbaTransition`
- Produces: `UbaMatchState.Cancel(int playerId): UbaTransition`
- Produces: `UbaMatchState.Timeout(DateTime now): UbaTransition`
- Produces: `Uba.Finish(Player loser, UbaFinishReason reason): void`, idempotent.
- Produces: `UltimateBattleArena.RemovePlayer(Player player): void`, valid for queued and matched players.

- [ ] **Step 1: Add failing pure state-transition tests**

Construct state for player IDs 11 and 22 with a fixed five-second deadline. Assert one acceptance remains pending, two acceptances return `Start`, acceptance after the deadline returns `Cancel`, either participant can cancel, an outsider cannot alter state, and a completed state cannot complete again.

- [ ] **Step 2: Run and verify RED**

Run: `powershell -ExecutionPolicy Bypass -File test/gameplay-reliability.test.ps1`

Expected: compilation fails because `UbaMatchState` and `UbaTransition` do not exist.

- [ ] **Step 3: Implement deterministic UBA state**

Create enum values `Pending`, `Start`, `Cancel`, `Finished`, store the two IDs, deadline, accepted-ID set, and a finished flag. Lock state-changing methods so duplicate network requests are harmless.

- [ ] **Step 4: Implement atomic pairing and acceptance**

In `UltimateBattleArena.Tick`, take two eligible queued entries and remove both with `TryRemove` before constructing `Uba`. `Uba` captures `OriginalLocation` records `{ MapId, X, Y }`, assigns itself to both players, sends page 3 with the five-second deadline, and registers its tick. Handlers delegate request/accept/cancel to the owning manager/match and never directly mutate opponent state.

- [ ] **Step 5: Implement arena start and protection countdown**

When both accept, disable cloak and attacks, jump each player once to the two map-121 positions, send the accepted/start window states, and retain `PeaceArea = true`. After both arrive, run a 20-second countdown; remove `uba_poi2` and `uba_poi3` for both clients and set `PeaceArea = false` exactly once.

- [ ] **Step 6: Implement idempotent completion and restoration**

`Attackable.Destroy` calls `Storage.Uba.Finish(player, Destroyed)` before normal player death processing and returns when UBA handled it. `GameSession.PrepareForDisconnect` calls `UltimateBattleArena.RemovePlayer(Player)` before removing the character. `Finish` marks the loser, sends the winner/loser result, disables attacks, removes player mines on map 121, restores HP/shield and `Destroyed = false`, jumps connected players to captured locations, updates disconnected players' map/position for persistence, clears storage flags, removes the match tick, and closes the UBA UI.

- [ ] **Step 7: Run tests and build**

Run the focused tests and full server build.

Expected: state tests pass and compilation exits 0.

### Task 5: Add PET kamikaze area damage and cooldown

**Files:**
- Create: `DarkOrbit 10.0/Game/Objects/Players/Managers/PetKamikazePolicy.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Pet.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Players/Managers/TimeManager.cs`
- Modify: `test/GameplayReliabilityTest.cs`

**Interfaces:**
- Produces: constants `Damage = 75000`, `Radius = 450`, `CooldownMilliseconds = 60000`.
- Produces: `PetKamikazePolicy.IsInRange(Position origin, Position target): bool`.
- Produces: `Pet.ActivateKamikaze(): bool`.

- [ ] **Step 1: Add failing boundary and cooldown tests**

Assert points at distances 449 and 450 are in range and 451 is outside. Assert a first activation timestamp is permitted, a request at 59,999 ms is blocked, and one at 60,000 ms is permitted.

- [ ] **Step 2: Run and verify RED**

Run the focused tests.

Expected: compilation fails because `PetKamikazePolicy` does not exist.

- [ ] **Step 3: Advertise and select Kamikaze gear**

During PET initialization send `PetGearAddCommand` for `PetGearTypeModule.KAMIKAZE` with level 3 and enabled true. Add a Kamikaze branch in `SwitchGear`; Passive and Guard keep current behavior.

- [ ] **Step 4: Implement one server-authoritative explosion**

On Kamikaze selection, require an active, non-destroyed PET and elapsed cooldown. Snapshot `InRangeCharacters`, filter by radius and `Owner.TargetDefinition(target, false)`, exclude owner/PET/group/clan allies, and require at least one target. Stamp cooldown before applying damage. Send the kamikaze graphic/attack type, apply 75,000 through `AttackManager.Damage(Owner, target, DamageType.KAMIKAZE, 75000, true, true, false)`, then destroy/deactivate the PET normally and send a 60-second cooldown to the owner.

- [ ] **Step 5: Run tests and build**

Run the focused tests and `scripts/build.ps1`.

Expected: all tests pass and compilation exits 0.

### Task 6: Fix Pilot Tree card and sprite geometry

**Files:**
- Modify: `web/cms/css/orbit.css:201-208`
- Modify: `web/cms/files/external/skill_tree.php`
- Modify: `scripts/verify-web-ui.js`

**Interfaces:**
- Produces: `.orbit-skill-grid` containing normal-flow `.skillContainer` cards with contained `.skill` sprites.
- Produces: `.orbit-research-footer` positioned after the complete grid.

- [ ] **Step 1: Add failing browser geometry assertions**

For `/skill-tree`, read all card and icon bounding rectangles. Assert every icon is fully inside its card, pairwise card intersections have zero area, the research footer top is at or below the grid bottom, and every `.skill` has a non-`none` background image and exactly 74-by-85 rendered dimensions. Run these checks at 1440-by-1000 and 390-by-844.

- [ ] **Step 2: Run and verify RED**

Run: `npm run verify:ui`

Expected: Pilot Tree containment/overlap assertions fail against the current screenshot layout.

- [ ] **Step 3: Scope and reset legacy positioning**

Add scoped rules:

```css
.orbit-ui .orbit-skill-grid { position:static; left:auto; top:auto; background:none; align-items:stretch; }
.orbit-ui .orbit-skill-grid .skillContainer { position:relative; inset:auto; min-height:150px; overflow:hidden; }
.orbit-ui .orbit-skill-grid .skill { position:relative; inset:auto; margin:0; flex:0 0 85px; }
.orbit-ui .orbit-skill-grid .skill[id] { top:auto; left:auto; }
.orbit-ui .orbit-skill-grid .skillPoints { position:absolute; }
```

Give the existing research heading/button wrapper class `orbit-research-footer` and ensure it remains in document flow.

- [ ] **Step 4: Deploy and rerun browser verification**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/apply-web-ui.ps1
npm run verify:ui
```

Expected: all images load, geometry assertions pass, desktop/mobile widths do not overflow, and screenshots show one centered icon per card.

### Task 7: Integrated build, restart, and smoke verification

**Files:**
- Modify: `LOCAL-SETUP.md` only if commands or supported gameplay behavior need documentation.

**Interfaces:**
- Consumes all prior tasks; produces no new gameplay API.

- [ ] **Step 1: Run the complete automated verification set**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File test/gameplay-reliability.test.ps1
powershell -ExecutionPolicy Bypass -File scripts/build.ps1
npm test
npm run verify:ui
```

Expected: every command exits 0 with zero failed assertions.

- [ ] **Step 2: Restart the local stack with the rebuilt server**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stop.ps1
powershell -ExecutionPolicy Bypass -File scripts/start.ps1 -NoClient
```

Expected: MariaDB, emulator, PHP, and gateway ports become ready and the start script exits 0.

- [ ] **Step 3: Verify kill logging against the live schema**

Run the database portion of `test/gameplay-reliability.test.ps1` once more after restart.

Expected: transaction inserts both `pushing=0` and `pushing=1` rows and rolls back cleanly.

- [ ] **Step 4: Inspect fresh runtime logs**

Record the newest emulator log timestamp, perform the available login/UI smoke route, and inspect only entries after restart. There must be no `TickManager` termination, SQL missing-default error, or unhandled exception.

- [ ] **Step 5: Review the final diff against the spec**

Check every requirement in the linked spec, inspect `git diff --check`, and confirm unrelated pre-existing changes were not overwritten or staged.

