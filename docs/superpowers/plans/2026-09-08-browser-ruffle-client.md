# Browser Ruffle Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make DarkOrbit 10 playable from Chrome without Adobe Flash, Electron, an extension, or a player-side download.

**Architecture:** Self-host pinned Ruffle JS/WASM through the existing PHP router. Map ActionScript TCP connections onto two fixed WebSocket routes backed by a Node gateway that forwards byte-exact traffic to the existing loopback game and chat listeners.

**Tech Stack:** PHP 7.4, Node.js 20+, `@ruffle-rs/ruffle@0.6.0`, `ws@8.21.3`, Node built-in test runner, PowerShell, existing C# emulator/MariaDB/CMS.

**Spec:** `docs/superpowers/specs/2026-09-08-browser-ruffle-client-design.md`

## Global Constraints

- Current forced-2D SWF client stays authoritative; no gameplay rewrite.
- Players install nothing; Ruffle JS/WASM and all game assets are self-hosted.
- Gateway exposes only fixed `/game` → `127.0.0.1:8080` and `/chat` → `127.0.0.1:9338` mappings.
- MariaDB, emulator TCP listeners, and CMS port `4301` remain non-public.
- Local HTTP uses `ws://127.0.0.1:8081`; production HTTPS uses same-origin `wss://.../socket/*` through reverse proxy.
- Every production function receives a failing behavioral test before implementation.

---

### Task 1: Browser bootstrap and pinned dependencies

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `web/ruffle-config.js`
- Create: `test/ruffle-config.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces browser global `window.darkOrbitRuffleConfig(location)` returning a Ruffle config object.
- Config includes two `socketProxy` records matching page hostname on ports `8080` and `9338`.

- [ ] **Step 1: Write failing config tests**

Test with Node `vm` and fake `location` values. Assert HTTP maps to `ws://<hostname>:8081/game|chat`, HTTPS maps to `wss://<host>/socket/game|chat`, exact TCP ports exist, and `publicPath` is `/browser/ruffle/`.

- [ ] **Step 2: Verify RED**

Run: `node --test test/ruffle-config.test.js`

Expected: FAIL because `web/ruffle-config.js` does not exist.

- [ ] **Step 3: Add manifests and minimal config implementation**

Create scripts `test`, `test:unit`, `verify`, `start:gateway`; require Node `>=20`; pin exact dependencies `@ruffle-rs/ruffle@0.6.0` and `ws@8.21.3`. Implement a plain browser script with no bundler and initialize `window.RufflePlayer.config` from the generated config.

- [ ] **Step 4: Install and verify GREEN**

Run: `npm install --package-lock-only`, `npm ci`, then `node --test test/ruffle-config.test.js`.

Expected: all config tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add .gitignore package.json package-lock.json web/ruffle-config.js test/ruffle-config.test.js
git commit -m "feat: add browser Ruffle bootstrap"
```

### Task 2: Restricted WebSocket-to-TCP gateway

**Files:**
- Create: `scripts/ws-gateway-lib.js`
- Create: `scripts/ws-proxy.js`
- Create: `test/ws-gateway.test.js`

**Interfaces:**
- Produces `createGateway(options): { server, listen(), close() }`.
- `options.routes` is a fixed map of URL pathname to `{ host, port }`; the CLI supplies only `/game` and `/chat`.
- Consumes binary WebSocket messages and emits byte-identical TCP data in both directions.

- [ ] **Step 1: Write failing route and health tests**

Start gateway on an ephemeral port. Assert `GET /health` returns status `200` plus `{ "status": "ok" }`; unknown upgrades return `404`; disallowed `Origin` returns `403`; allowed route reaches a fake TCP listener.

- [ ] **Step 2: Verify RED**

Run: `node --test test/ws-gateway.test.js`

Expected: FAIL because `scripts/ws-gateway-lib.js` does not exist.

- [ ] **Step 3: Implement connection admission**

Use `http`, `net`, and `ws` in `noServer` mode. Validate path and origin before `handleUpgrade`; configure `maxPayload`; connect only to the route's fixed target; expose `/health` without route internals.

- [ ] **Step 4: Verify admission tests GREEN**

Run: `node --test test/ws-gateway.test.js`

Expected: admission and health tests PASS.

- [ ] **Step 5: Write failing forwarding tests**

Assert a binary payload containing zero bytes reaches fake TCP byte-exactly, fake TCP response reaches WebSocket byte-exactly, text frames close with code `1003`, and closing either side cleans up the other side.

- [ ] **Step 6: Verify new tests RED**

Run: `node --test test/ws-gateway.test.js`

Expected: forwarding assertions FAIL because handlers are absent.

- [ ] **Step 7: Implement forwarding and cleanup**

Forward `Buffer` objects without string conversion. Reject text. Check `ws.bufferedAmount`; pause TCP above a bounded high-water mark and resume on a short unref'd timer. Make cleanup idempotent. Log connection events without credentials or payload contents.

- [ ] **Step 8: Add production CLI and verify GREEN**

Bind `DO_WS_BIND_ADDRESS` default `127.0.0.1`, `DO_WS_PORT` default `8081`; use `DO_WEB_ORIGINS` with local safe defaults; map fixed emulator ports. Handle `SIGINT`/`SIGTERM` gracefully. Run `node --test test/ws-gateway.test.js`.

- [ ] **Step 9: Commit**

```powershell
git add scripts/ws-gateway-lib.js scripts/ws-proxy.js test/ws-gateway.test.js
git commit -m "feat: add restricted game socket gateway"
```

### Task 3: PHP browser runtime serving and map injection

**Files:**
- Create: `scripts/browser-runtime.php`
- Create: `test/browser-runtime.test.php`
- Modify: `scripts/router.php`

**Interfaces:**
- Produces `darkorbit_browser_asset($requestPath, $projectRoot)` returning an allowlisted file plus MIME type or `null`.
- Produces `darkorbit_inject_ruffle($html)` inserting config then Ruffle runtime before legacy Flash embedding code.
- Routes `/browser/ruffle/*` to pinned package files and `/browser/ruffle-config.js` to tracked bootstrap.

- [ ] **Step 1: Write failing PHP unit tests**

Assert traversal is rejected, JS and WASM MIME types are exact, missing files return `null`, injection happens once, config precedes runtime, runtime precedes `jquery.flashembed.js`, and unrelated HTML remains unchanged.

- [ ] **Step 2: Verify RED**

Run: `.local/php/php.exe test/browser-runtime.test.php`

Expected: FAIL because `scripts/browser-runtime.php` does not exist.

- [ ] **Step 3: Implement runtime helpers**

Resolve canonical paths under only `web/` and `node_modules/@ruffle-rs/ruffle/`. Return `application/wasm`, `text/javascript; charset=utf-8`, or safe binary MIME values. Inject two deferred scripts before legacy embed script with an idempotency marker.

- [ ] **Step 4: Verify helper tests GREEN**

Run: `.local/php/php.exe test/browser-runtime.test.php`

Expected: all helper tests PASS.

- [ ] **Step 5: Write failing live-router assertions**

Extend `scripts/verify-browser.js` to request runtime JS/WASM and authenticated `/map-revolution`; assert status, MIME, non-empty body, one injection marker, and script ordering.

- [ ] **Step 6: Verify live assertions RED**

Run with local services: `node scripts/verify-browser.js`.

Expected: FAIL because routes/injection are not wired.

- [ ] **Step 7: Wire router**

Serve allowlisted browser assets before CMS routing. Add one outer output buffer around dynamic CMS rendering and transform only `/map-revolution`; retain all existing private-path checks.

- [ ] **Step 8: Verify GREEN and regressions**

Run: `.local/php/php.exe test/browser-runtime.test.php`, `node scripts/verify-browser.js`, and `node scripts/verify.js`.

Expected: all PASS.

- [ ] **Step 9: Commit**

```powershell
git add scripts/browser-runtime.php scripts/router.php scripts/verify-browser.js test/browser-runtime.test.php
git commit -m "feat: serve Ruffle browser client"
```

### Task 4: One-click lifecycle and production guidance

**Files:**
- Modify: `scripts/start.ps1`
- Modify: `scripts/stop.ps1`
- Modify: `LOCAL-SETUP.md`
- Modify: `README.md`
- Modify: `scripts/verify-browser.js`

**Interfaces:**
- `scripts/start.ps1` starts `ws-proxy` before web readiness and accepts `-LegacyClient` for optional Electron fallback.
- `scripts/stop.ps1` validates and stops the Node gateway PID.
- Browser verification consumes live CMS, emulator, gateway, and Ruffle routes.

- [ ] **Step 1: Add failing lifecycle source assertions**

In `scripts/verify-browser.js`, assert startup references `ws-proxy.js`, stores `ws-proxy.pid`, defaults away from Electron, and stop script contains the matching validated process entry.

- [ ] **Step 2: Verify RED**

Run: `node scripts/verify-browser.js`.

Expected: lifecycle assertions FAIL.

- [ ] **Step 3: Implement lifecycle changes**

Replace `-NoClient` with compatible switches that default to browser-only and retain explicit `-LegacyClient`. Validate `node_modules` and run `npm ci` server-side when absent. Start gateway hidden, wait on port `8081`, and stop it by verified executable path/PID.

- [ ] **Step 4: Document local and production operation**

Document Chrome URL, no player-side install, gateway env vars, HTTPS/WSS requirement, reverse-proxy route mapping, firewall allowlist, and legacy fallback. State that public hosting requires rights to distribute included proprietary assets.

- [ ] **Step 5: Verify GREEN**

Stop stack, start with `Start-DarkOrbit.cmd`, then run `npm test`. Confirm no Electron process starts and gateway health is reachable.

- [ ] **Step 6: Commit**

```powershell
git add scripts/start.ps1 scripts/stop.ps1 scripts/verify-browser.js LOCAL-SETUP.md README.md
git commit -m "feat: make Chrome client default"
```

### Task 5: Real Chrome end-to-end validation

**Files:**
- Modify as failures require: browser/gateway/router files from Tasks 1-4
- Update: `LOCAL-SETUP.md` only for confirmed compatibility notes

**Interfaces:**
- Consumes complete live stack and test account from `.local/credentials.json`.
- Produces evidence that Chrome loaded Ruffle, SWF assets, and both socket paths.

- [ ] **Step 1: Run full automated verification fresh**

Run: `npm test`, `node scripts/verify.js`, `.local/php/php.exe scripts/verify-defaults.php`.

Expected: zero failures.

- [ ] **Step 2: Open Chrome and authenticate**

Use the real CMS API/login page, navigate to `/map-revolution`, inspect console/network without exposing credentials, and confirm Ruffle JS/WASM plus `preloader.swf` and `main.swf` return successfully.

- [ ] **Step 3: Exercise gameplay**

Confirm map finishes initialization, ship renders, click-to-move changes position, select an NPC and fire once, activate PET, use a portal where available, and send/receive one chat message.

- [ ] **Step 4: Convert every discovered defect into RED-GREEN test**

Before each fix, add the smallest failing automated regression where possible; otherwise preserve browser console/network evidence and add a deterministic startup verifier assertion. Re-run the affected test after each minimal fix.

- [ ] **Step 5: Final verification and commit**

Run all Task 5 Step 1 commands again, inspect `git diff --check`, and commit only verified fixes/docs:

```powershell
git add package.json package-lock.json web scripts test LOCAL-SETUP.md README.md
git commit -m "fix: complete browser gameplay compatibility"
```
