<?php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$credentials = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents(__DIR__.'/../.local/credentials.json')), true);
$db = new mysqli('127.0.0.1', 'root', $credentials['dbPassword'], 'darkorbit_local', 3307);
function check($condition, $message) { if (!$condition) { throw new RuntimeException($message); } }
$db->begin_transaction();
try {
    $db->query("INSERT INTO player_accounts (sessionId, username, pilotName, email, password, info, verification) VALUES ('defaults-test','defaults_test','defaults_test','defaults@example.test','unused','{}','{\"verified\":true}')");
    $id = (int)$db->insert_id;
    $db->query("INSERT INTO player_equipment (userId) VALUES ($id)");
    $db->query("INSERT INTO player_settings (userId) VALUES ($id)");
    $account = $db->query("SELECT * FROM player_accounts WHERE userId=$id")->fetch_assoc();
    $equipment = $db->query("SELECT * FROM player_equipment WHERE userId=$id")->fetch_assoc();
    $items = json_decode($equipment['items'], true);
    $boosters = json_decode($equipment['boosters'], true);
    check((int)$account['version'] === 0, 'New accounts must use 2D');
    check($items['lf4Count'] === 50, 'New accounts must own 50 LF-4');
    check($items['apis'] && $items['zeus'] && $items['pet'], 'Elite drones and PET must be owned');
    check($items['havocCount'] === 10 && $items['herculesCount'] === 10, 'Both drone design sets must be owned');
    check(count($items['ships']) >= 6 && count($items['designs'][10]) >= 20, 'Playable ships and Goliath designs must be unlocked');
    check(count(json_decode($equipment['config1_lasers'])) === 15, 'Default ship lasers must be equipped');
    foreach ([1,2] as $config) {
        $drones = json_decode($equipment["config{$config}_drones"], true);
        check(count($drones) === 10, 'All 10 drones must be equipped');
        foreach ($drones as $drone) { check(count($drone['items']) === 2 && count($drone['designs']) === 1, 'Drone slots must be filled'); }
    }
    check(json_decode($equipment['skill_points'], true)['engineering'] === 5, 'Pilot skills must be maxed');
    check(count($boosters['2']) === 3 && count($boosters['3']) === 2 && count($boosters['7']) === 2, 'Elite damage, both shield and HP boosters must be present');
    check(array_column($boosters['3'], 'Type') === [15, 16], 'SHD-B01 and SHD-B02 must both be present');
    foreach ($boosters as $entries) { foreach ($entries as $booster) { check($booster['Seconds'] === -1, 'Elite boosters must be permanent'); } }
    echo "PASS: new account defaults are 2D, LV16 elite inventory, permanent boosters, equipped configurations, max skills.\n";
} finally { $db->rollback(); }
