# Nickname 1v1 Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build nickname invitations and isolated, automatically cleaned 1v1 arena matches around the original Flash client.

**Architecture:** A native HTML overlay polls a same-origin PHP API backed by a short-lived invite table. Accepted invites cross the existing CMS-to-emulator socket boundary; the emulator validates both players and allocates a map-scoped `Duel` instance.

**Tech Stack:** C#/.NET emulator, PHP 7.4/MariaDB CMS, vanilla JavaScript/CSS, PowerShell and C# regression tests.

**Spec:** `docs/superpowers/specs/2026-09-11-nickname-duel-arena-design.md`

## Global Constraints

- Preserve the original Flash SWF; UI must be an external overlay.
- Work directly in the user-selected project and preserve the existing dirty worktree; do not create commits.
- Invitations expire after 60 seconds; countdown is 25 seconds; arena pool is map IDs 101-111.
- All state changes must validate authenticated user identity server-side.

---

### Task 1: Duel state policy and arena lifecycle

**Files:**
- Create: `DarkOrbit 10.0/Game/Events/DuelPolicy.cs`
- Modify: `DarkOrbit 10.0/Game/Events/Duel.cs`
- Modify: `DarkOrbit 10.0/Game/Objects/Attackable.cs`
- Modify: `DarkOrbit 10.0/Game/GameSession.cs`
- Test: `test/DuelPolicyTest.cs`
- Test: `test/duel-arena-policy.test.ps1`

**Interfaces:**
- Produces: `DuelPolicy.CanInvite(...)`, `Duel.TryCreate(Player, Player)`, idempotent `Duel.RemovePlayer(Player)`.

- [ ] Write a failing policy test covering self/offline/busy rejection, 60-second expiration, and map pool bounds.
- [ ] Run the test and confirm RED.
- [ ] Implement policy and refactor `Duel` to allocate one map per match, save return locations, count down, finish once, and restore players.
- [ ] Suppress the normal kill screen for duel deaths and keep disconnect cleanup connected to `Duel.RemovePlayer`.
- [ ] Run the focused test and compile the emulator.

### Task 2: Authenticated invitation API

**Files:**
- Create: `scripts/arena-api.php`
- Modify: `scripts/apply-elite-defaults.php`
- Modify: `scripts/apply-web-ui.ps1`
- Modify: `DarkOrbit 10.0/Net/SocketServer.cs`
- Test: `test/arena-api.test.php`
- Test: `test/arena-api.test.ps1`

**Interfaces:**
- Consumes: `Duel.TryCreate(Player, Player)`.
- Produces: POST actions `invite`, `poll`, `accept`, `decline`; socket actions `CanStartDuel`, `StartDuel`.

- [ ] Write a failing API/schema regression test.
- [ ] Run the test and confirm RED.
- [ ] Create the invite table migration with indexes and a 60-second expiry.
- [ ] Implement prepared-statement invite, poll, accept, and decline operations.
- [ ] Implement synchronous emulator validation/start responses.
- [ ] Install `arena-api.php` durably and run PHP lint/tests.

### Task 3: In-game overlay

**Files:**
- Create: `scripts/arena-ui.js`
- Create: `scripts/arena-ui.css`
- Modify: `scripts/apply-web-ui.ps1`
- Test: `test/arena-ui.test.js`

**Interfaces:**
- Consumes: `/arena-api.php` actions from Task 2.
- Produces: fixed 1v1 button, nickname form, invitation prompt, feedback toast, one-second polling.

- [ ] Write a failing DOM/source behavior test for invite, accept, decline, and polling.
- [ ] Run the test and confirm RED.
- [ ] Implement compact overlay with safe text rendering, request locking, and Flash-friendly pointer behavior.
- [ ] Inject CSS/JS tags into `map_revolution.php` during web installation.
- [ ] Run JS tests and verify the overlay on an authenticated map page.

### Task 4: End-to-end verification and deployment

**Files:**
- Modify: `LOCAL-SETUP.md`
- Test: existing full test suites and server logs.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: rebuilt live local server and client package.

- [ ] Stop the running emulator, build current C# sources, and restart services.
- [ ] Use two temporary accounts to invite, poll, decline, invite again, and accept.
- [ ] Confirm both players are handed to the emulator and invitation status becomes accepted.
- [ ] Run focused PowerShell/PHP tests, `npm test`, build freshness, and `git diff --check`.
- [ ] Rebuild the downloadable client and inspect PHP/emulator logs for new fatal errors.
