# Native browser client

Approved direction: replace the SWF client with a native Canvas 2D client, preserving the existing authoritative C# server and CMS accounts. No plugin, client download, or Ruffle in the native route.

## Design and implementation plan

- [ ] Implement a bounded binary codec in `web/native/protocol.mjs`: big-endian framing, fragmented/coalesced messages, rotations inverse to C# serializers, login, movement, selection, combat, portals, PET. Unknown commands are ignored by frame length; malformed known commands fail visibly.
- [ ] Add `scripts/native-client.php` using existing CMS authentication. `/play` and `/map-revolution` serve a native shell; `/native-session` returns only the logged-in account's game session with no-store. Keep the historical map at `/legacy-map` for diagnostic comparison.
- [ ] Build `web/native/client.mjs` and `client.css`: responsive starfield/map canvas, server ships, camera, click navigation, target selection, combat effects, stats, minimap, gate/PET actions, connection errors, reconnect. Use server-confirmed state; local movement interpolation is predictive until server refresh.
- [ ] Remove the raw CMS control socket from browser gateway routes. Preserve game and chat gateways and existing origin restrictions.
- [ ] Verify codecs against real C# serialized fixtures; test Chrome login, canvas, game initialization and movement persisted on reconnect. Update setup docs with actual supported features and known gaps.

## Acceptance and scope

Deliver a working native gameplay foundation, not a claim of parity with every historical event/UI. First evidence must include real server initialization and movement confirmed by a second login. Existing hangar continues to manage inventory. Native ship artwork starts with code-drawn silhouettes; original SWF art conversion is a separate asset pipeline. No DB reset or changed player grants. No public deployment implied by localhost verification.
