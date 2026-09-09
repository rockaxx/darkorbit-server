<?php
$helper = __DIR__.'/../web/cms/files/external/includes/ui.php';
if (is_file($helper)) require $helper;
function checkArt($condition, $message) { if (!$condition) throw new RuntimeException($message); }
checkArt(function_exists('orbit_ship_art'), 'Ship artwork resolver must exist');
$root = __DIR__.'/../.local/cms';
foreach (['ship_goliath', 'ship_aegis', 'ship_citadel', 'ship_spearhead', 'ship_vengeance_design_pusat', 'ship_goliath_design_goliath-razer'] as $loot) {
    foreach ([1,2,3] as $faction) {
        $url = orbit_ship_art($loot, $faction, $root);
        checkArt(is_file($root.$url) && @getimagesize($root.$url) !== false, "$loot faction $faction must resolve to a real image");
        checkArt(strpos($url, 'unknown') === false, "$loot must use real ship artwork");
    }
}
checkArt(orbit_ship_art('ship_aegis', 2, $root) !== orbit_ship_art('ship_aegis', 1, $root), 'Faction-specific hulls must use their company artwork');
checkArt(orbit_ship_art('../../files/config', 1, $root) === '/css/orbit-unknown.svg', 'Invalid loot IDs must use safe fallback');
echo "PASS: ship artwork, faction variants, Razer alias and invalid IDs.\n";
