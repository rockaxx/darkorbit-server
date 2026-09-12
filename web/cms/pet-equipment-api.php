<?php
require_once __DIR__.'/files/config.php';
header('Content-Type: application/json; charset=utf-8');

function petEquipmentResponse(bool $status, string $message, array $extra = []): void {
    echo json_encode(array_merge(['status'=>$status, 'message'=>$message], $extra));
    exit;
}

function petEquipmentArray($value): array {
    $decoded = json_decode((string)$value, true);
    if (!is_array($decoded)) return [];
    return array_values(array_unique(array_map('intval', $decoded)));
}

function petEquipmentConfigs(array $row): object {
    return (object)[
        '1'=>[
            'lasers'=>petEquipmentArray($row['config1_pet_lasers']),
            'shields'=>petEquipmentArray($row['config1_pet_generators']),
            'laserCapacity'=>6,
            'shieldCapacity'=>12
        ],
        '2'=>[
            'lasers'=>petEquipmentArray($row['config2_pet_lasers']),
            'shields'=>petEquipmentArray($row['config2_pet_generators']),
            'laserCapacity'=>6,
            'shieldCapacity'=>12
        ]
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !Functions::IsLoggedIn()) {
    http_response_code(401);
    petEquipmentResponse(false, 'Musíš byť prihlásený.');
}

$db = Database::GetInstance();
$player = Functions::GetPlayer();
$userId = (int)$player['userId'];
$action = (string)($_POST['action'] ?? 'status');
$select = $db->prepare('SELECT config1_lasers, config1_generators, config1_drones, config2_lasers, config2_generators, config2_drones, config1_pet_lasers, config1_pet_generators, config2_pet_lasers, config2_pet_generators, items FROM player_equipment WHERE userId=?');
$select->bind_param('i', $userId);
$select->execute();
$equipment = $select->get_result()->fetch_assoc();
if (!$equipment) petEquipmentResponse(false, 'Výbava hráča neexistuje.');

$owned = json_decode((string)$equipment['items'], true);
if (empty($owned['pet'])) petEquipmentResponse(false, 'P.E.T. nie je odomknutý.');
if ($action === 'status') petEquipmentResponse(true, '', ['configs'=>petEquipmentConfigs($equipment)]);

if (!in_array($action, ['add','remove','equipAll','clear'], true)) petEquipmentResponse(false, 'Neznáma PET akcia.');
$config = (int)($_POST['config'] ?? 0);
$type = (string)($_POST['type'] ?? '');
if (!in_array($config, [1,2], true) || !in_array($type, ['laser','shield'], true)) petEquipmentResponse(false, 'Neplatná PET konfigurácia.');

$isOnline = Socket::Get('IsOnline', ['UserId'=>$userId, 'Return'=>false]);
if ($isOnline === true && Socket::Get('IsInEquipZone', ['UserId'=>$userId, 'Return'=>false]) !== true) {
    petEquipmentResponse(false, 'Výbavu môžeš meniť iba pri hangári.');
}

$suffix = $type === 'laser' ? 'pet_lasers' : 'pet_generators';
$column = 'config'.$config.'_'.$suffix;
$capacity = $type === 'laser' ? 6 : 12;
$pool = $type === 'laser' ? range(175,180) : range(50,61);
$current = petEquipmentArray($equipment[$column]);

$shipColumn = 'config'.$config.($type === 'laser' ? '_lasers' : '_generators');
$used = petEquipmentArray($equipment[$shipColumn]);
$drones = json_decode((string)$equipment['config'.$config.'_drones'], true);
if (is_array($drones)) {
    foreach ($drones as $drone) {
        if (!empty($drone['items']) && is_array($drone['items'])) $used = array_merge($used, array_map('intval', $drone['items']));
    }
}
$available = array_values(array_diff($pool, $used));

if ($action === 'add') {
    $candidates = array_values(array_diff($available, $current));
    $candidate = $candidates[0] ?? null;
    if ($candidate === null || count($current) >= $capacity) petEquipmentResponse(false, 'Žiadny voľný predmet alebo plné PET sloty.');
    $current[] = (int)$candidate;
} elseif ($action === 'remove') {
    if (!$current) petEquipmentResponse(false, 'PET sloty sú už prázdne.');
    array_pop($current);
} elseif ($action === 'equipAll') {
    $current = array_slice($available, 0, $capacity);
} else {
    $current = [];
}

$json = json_encode(array_values($current));
$update = $db->prepare("UPDATE player_equipment SET $column=? WHERE userId=?");
$update->bind_param('si', $json, $userId);
$update->execute();
$equipment[$column] = $json;
if ($isOnline === true) Socket::Send('UpdateStatus', ['UserId'=>$userId]);
petEquipmentResponse(true, 'PET výbava uložená.', ['configs'=>petEquipmentConfigs($equipment)]);
