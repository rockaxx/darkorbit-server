<?php
function orbit_escape($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

// Artwork for support ships is stored under company-specific names in the CMS.
function orbit_ship_art($lootId, $faction = 1, $root = null) {
    $root = $root ?: dirname(__DIR__, 3);
    if (!preg_match('/^ship_[a-z0-9_-]+$/i', $lootId)) return '/css/orbit-unknown.svg';
    $lootId = str_replace('design_goliath-razer', 'design_razer', $lootId);
    if ($lootId === 'ship_vengeance_design_pusat') $lootId = 'ship_pusat';
    $path = str_replace('_', '/', $lootId);
    $company = [1 => 'mmo', 2 => 'eic', 3 => 'vru'][(int)$faction] ?? 'mmo';
    $candidates = [];
    if (in_array($lootId, ['ship_aegis', 'ship_citadel', 'ship_spearhead'], true)) {
        $name = substr($lootId, 5);
        $candidates[] = "/do_img/global/items/ship/$name/$name-$company".'_top.png';
        $candidates[] = "/do_img/global/items/ship/$name-$company".'_top.png';
    }
    $candidates[] = '/do_img/global/items/'.$path.'_top.png';
    $candidates[] = '/do_img/global/items/'.$path.'_100x100.png';
    $candidates[] = '/do_img/global/items/'.$lootId.'_100x100.png';
    foreach ($candidates as $candidate) {
        if (is_file($root.$candidate) && @getimagesize($root.$candidate) !== false) return $candidate;
    }
    return '/css/orbit-unknown.svg';
}

function orbit_icon($name) {
    $paths = [
        'home' => '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
        'ships' => '<path d="m12 3 8 17-8-4-8 4 8-17Z"/><path d="M12 3v13"/>',
        'equipment' => '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
        'skill_tree' => '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v6M5 17v-4h14v4"/>',
        'clan' => '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
        'shop' => '<path d="M3 4h2l3 12h11l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
        'settings' => '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
        'logout' => '<path d="M9 4H4v16h5M9 12h12m-5-5 5 5-5 5"/>',
    ];
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'.($paths[$name] ?? $paths['ships']).'</svg>';
}
