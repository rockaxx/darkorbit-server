# Browser-native DarkOrbit client design

## Goal

Run the existing DarkOrbit 10 game from a normal Chrome tab without Adobe Flash, Electron, a browser extension, or any player-side download. Preserve the existing PHP CMS, SWF game assets, C# emulator, protocol, and database.

## Scope and success criteria

The first production-capable browser release covers the existing forced-2D client. A logged-in user opens `/map-revolution`, the Ruffle WebAssembly runtime loads the existing `preloader.swf` and `main.swf`, and the client connects to game and chat services through browser-compatible WebSockets. Login, map initialization, movement, targeting/combat, PET, portals, and chat must remain usable.

The operator may still install server dependencies. Players need only a current Chrome-compatible browser. Native Adobe Flash and the legacy Electron/Pepper Flash launcher become optional fallback components, not requirements.

## Chosen approach

Self-host a pinned Ruffle web build and add a narrowly scoped WebSocket-to-TCP gateway. This reuses the original client and is substantially smaller and less risky than recreating the entire renderer, UI, audio, asset loader, and binary protocol in a new HTML5 client.

Two alternatives are rejected for this phase:

- A full PixiJS/Phaser rewrite would eliminate SWF files too, but would require a new game client and long parity effort.
- Requiring users to install a Ruffle extension or standalone player would preserve a client-side installation requirement and fail the product goal.

Ruffle emulates Flash in WebAssembly; Adobe Flash Player is not installed or shipped. SWF remains the source asset format in this phase.

## Architecture

```text
Chrome
  | HTTP(S): CMS, SWF/assets, Ruffle JS/WASM
  v
PHP CMS/router
  |
  | WS(S): fixed /game and /chat endpoints
  v
Node WebSocket gateway
  | TCP 127.0.0.1:8080 / 127.0.0.1:9338
  v
C# DarkOrbit emulator ---- MariaDB
```

The PHP router serves tracked browser bootstrap files and the pinned Ruffle distribution. On `/map-revolution`, it injects Ruffle configuration before the legacy Flash embedding script executes. The configuration maps the exact `(host, port)` pairs requested by ActionScript `Socket.connect()` to fixed WebSocket gateway URLs.

The gateway never accepts a destination supplied by the browser. `/game` always reaches TCP port `8080`; `/chat` always reaches `9338`. This prevents creation of an open TCP proxy.

## Components and files

- `package.json` and lockfile: pin `@ruffle-rs/ruffle` and the WebSocket server dependency; expose test/start scripts.
- `web/ruffle-config.js`: derive local `ws://` or production same-origin `wss://` endpoints and publish Ruffle configuration.
- `scripts/ws-proxy.js`: HTTP health endpoint plus binary WebSocket-to-TCP forwarding for the two allowlisted routes.
- `scripts/router.php`: safely serve browser runtime files and inject the bootstrap into the map response while retaining private-path protections.
- `scripts/start.ps1` and `scripts/stop.ps1`: install/check server-side Node dependencies, start/stop the gateway, and default to opening the normal browser path instead of Electron.
- `scripts/verify-browser.js`: verify static runtime availability, injection order, gateway health, origin rejection, and byte-exact forwarding.
- `LOCAL-SETUP.md`: local Chrome flow and production HTTPS/WSS reverse-proxy requirements.

No downloaded runtime or generated dependency directory is committed. Reproducibility comes from the lockfile.

## Data flow

1. User logs into existing CMS; PHP retains its current session and rotates the game session identifier as before.
2. `/map-revolution` renders existing FlashVars, including `userID`, `sessionID`, `host`, and `chatHost`.
3. Ruffle loads `preloader.swf`, then the current `main.swf` and existing same-origin assets.
4. When ActionScript requests `host:8080` or `chatHost:9338`, Ruffle opens the configured WebSocket URL.
5. Gateway unwraps binary WebSocket messages to TCP and wraps TCP bytes back into binary WebSocket messages without parsing or modifying the DarkOrbit protocol.
6. Existing emulator authenticates the session and remains authoritative for game state.

## Local and production networking

Local mode uses `http://127.0.0.1` and a loopback gateway such as `ws://127.0.0.1:8081/game`. Production serves CMS/assets over HTTPS and reverse-proxies same-origin paths such as `/socket/game` and `/socket/chat` to the loopback gateway, yielding WSS in Chrome.

MariaDB, emulator TCP ports, and CMS control port `4301` stay private. Only HTTP(S) and the two fixed WebSocket routes are public. Gateway validates the HTTP `Origin` header against configured origins, applies payload and connection limits, and closes both sides on error or disconnect.

## Error handling

- Unknown WebSocket paths and disallowed origins are rejected before TCP connection creation.
- TCP connect failures close the WebSocket with a server-error code and concise log entry.
- WebSocket text frames are rejected; game traffic must be binary.
- Backpressure pauses/resumes TCP reads when WebSocket buffering crosses limits.
- Startup fails with an actionable message if pinned dependencies are absent and cannot be installed.
- Ruffle console errors remain visible in browser DevTools; bootstrap emits a clear in-page failure if WebAssembly cannot load.

## Testing

Automated tests follow red-green TDD and cover:

- route allowlist, origin validation, health response, binary forwarding, reverse forwarding, and disconnect cleanup using ephemeral local TCP ports;
- router private-file protections and correct MIME types for `.wasm` and browser JS;
- `/map-revolution` bootstrap/config ordering;
- existing login and binary game initialization verification.

Final manual E2E uses a real Chrome session: log in, open the map, confirm Ruffle and SWF load, confirm game socket connection, and exercise movement plus one combat action. Chat is checked separately because it uses a second socket.

## Compatibility boundary

Ruffle ActionScript 3 support is incomplete, so successful embedding alone does not prove game parity. Any runtime incompatibility discovered by the E2E test is treated as a reproducible compatibility bug: capture exact browser error, add the smallest regression test or deterministic probe available, then patch configuration/client integration. Recompiling or decompiling proprietary SWF code is outside this phase unless a specific blocking incompatibility makes it necessary and asset rights permit it.

## Deployment and rights

Public hosting must use a domain, TLS certificate, reverse proxy, server-side secrets, database backups, logging, and rate/connection limits. Repository code is MIT-licensed, but the included DarkOrbit name, SWFs, graphics, audio, and other game assets may carry separate third-party rights. Public distribution requires the operator to confirm permission for those assets and trademarks.
