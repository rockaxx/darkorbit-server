# Hangar PET Panel and SHD-B02 Design

## Goal

Make the legacy Hangar load reliably while retaining PET laser/shield equipment, and grant both permanent shield boosters (`SHD-B01` and `SHD-B02`) to existing and new accounts.

## Root cause

The bundled inventory SWF loads successfully with its original `ship` and `drones` configuration schema. Adding custom `general.pet` or `config.*.pet` structures still produces valid HTTP 200 JSON, but the SWF stops during initialization because the exact historical PET schema and supporting item metadata are absent from this emulator. The reliable boundary is therefore to leave the legacy SWF payload unchanged and expose PET equipment through normal HTML/PHP UI beside it.

## Hangar design

`scripts/apply-web-ui.ps1` will remove every injected PET object and PET-specific move-target modification from the generated `flashAPI/inventory.php`. The original ship/drone inventory behavior and the existing level-16 equipment modifications remain intact.

The Hangar page receives a compact HTML PET panel below the Flash inventory. It displays configuration 1 and 2 separately, with six laser slots and twelve shield slots. It reads and writes the existing `config1_pet_lasers`, `config1_pet_generators`, `config2_pet_lasers`, and `config2_pet_generators` columns through an authenticated local PHP endpoint. Controls equip or remove available LF-4 and BO2 item instance IDs without duplicating an instance already assigned to ship, drones, or the other PET slots.

The endpoint validates the logged-in account, configuration number, slot type, action, item ownership, capacity, and equipment-zone/online rule. It returns JSON with the current PET loadout and a clear error message. Successful changes notify the game server to refresh the player's status; the existing server-side PET damage and shield calculation remains the source of gameplay values.

## Booster design

The starter profile will contain permanent `SHD-B01` (type 15) and `SHD-B02` (type 16) entries under the shield attribute. `BoosterManager.EnsureEliteBoosters` will enforce both entries with `Seconds = -1` for loaded accounts. The database migration will add or repair both entries for existing accounts while preserving unrelated boosters.

The current percentage mapping remains unchanged: each shield booster contributes its existing configured percentage, and the combined percentage is calculated by the existing booster aggregation code.

## Files and responsibilities

- `scripts/apply-web-ui.ps1`: restore Flash-compatible inventory payload and install the PET panel assets.
- `web/cms/files/external/equipment.php`: host the PET panel container beside the Flash inventory.
- `web/cms/pet-equipment-api.php`: authenticated PET loadout reads and mutations.
- `web/cms/js/pet-equipment.js` and `web/cms/css/pet-equipment.css`: render and operate the panel.
- `scripts/starter-profile.php` and `scripts/apply-elite-defaults.php`: add and migrate `SHD-B02`.
- `DarkOrbit 10.0/Game/Objects/Players/Managers/BoosterManager.cs`: enforce `SHD-B02` at runtime.

## Verification

Tests will first reproduce the failures and then verify:

- the generated Flash payload has no `general.pet` or `config.*.pet` objects and initializes successfully;
- the PET endpoint exposes exactly six laser and twelve shield slots per configuration;
- invalid IDs, duplicate assignments, over-capacity loadouts, and unauthenticated writes are rejected;
- equipping/removing PET items persists in the database and is reflected in the endpoint response;
- starter defaults, migration, and runtime enforcement contain both `SHD-B01` and `SHD-B02` permanently;
- the full JavaScript, PowerShell, PHP syntax, live endpoint, and C# build verification suites pass.

