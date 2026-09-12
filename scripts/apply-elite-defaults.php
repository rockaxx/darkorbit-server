<?php
if (PHP_SAPI !== 'cli') { exit(1); }
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require __DIR__.'/starter-profile.php';

$credentials = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents(__DIR__.'/../.local/credentials.json')), true);
$db = new mysqli('127.0.0.1', 'root', $credentials['dbPassword'], 'darkorbit_local', 3307);
$db->set_charset('utf8mb4');
$db->query("CREATE TABLE IF NOT EXISTS player_duel_invites (
    inviteId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    inviterId INT NOT NULL,
    inviteeId INT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiresAt DATETIME NOT NULL,
    respondedAt DATETIME NULL,
    PRIMARY KEY (inviteId),
    KEY idx_duel_invitee_status (inviteeId, status, expiresAt),
    KEY idx_duel_inviter_status (inviterId, status, expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$db->query("CREATE TABLE IF NOT EXISTS player_duel_stats (
    userId INT NOT NULL,
    wins INT UNSIGNED NOT NULL DEFAULT 0,
    losses INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (userId),
    KEY idx_duel_wins (wins, losses)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$db->query("ALTER TABLE player_equipment ADD COLUMN IF NOT EXISTS config1_pet_lasers MEDIUMTEXT NOT NULL DEFAULT '[]'");
$db->query("ALTER TABLE player_equipment ADD COLUMN IF NOT EXISTS config1_pet_generators MEDIUMTEXT NOT NULL DEFAULT '[]'");
$db->query("ALTER TABLE player_equipment ADD COLUMN IF NOT EXISTS config2_pet_lasers MEDIUMTEXT NOT NULL DEFAULT '[]'");
$db->query("ALTER TABLE player_equipment ADD COLUMN IF NOT EXISTS config2_pet_generators MEDIUMTEXT NOT NULL DEFAULT '[]'");
$petLasers = json_encode(range(175, 180));
$petShields = json_encode(range(50, 61));
foreach ([1, 2] as $config) {
    $db->query("UPDATE player_equipment SET config{$config}_pet_lasers='$petLasers' WHERE config{$config}_pet_lasers IS NULL OR config{$config}_pet_lasers IN ('', '[]')");
    $db->query("UPDATE player_equipment SET config{$config}_pet_generators='$petShields' WHERE config{$config}_pet_generators IS NULL OR config{$config}_pet_generators IN ('', '[]')");
}
$required = starterProfile($db)['player_equipment']['boosters'];
$defaultJson = json_encode($required);
$db->query("ALTER TABLE `player_equipment` ALTER COLUMN `boosters` SET DEFAULT '".$db->real_escape_string($defaultJson)."'");

$rows = $db->query('SELECT userId, boosters FROM player_equipment')->fetch_all(MYSQLI_ASSOC);
$update = $db->prepare('UPDATE player_equipment SET boosters=? WHERE userId=?');
$db->begin_transaction();
try {
    foreach ($rows as $row) {
        $boosters = json_decode($row['boosters'], true);
        if (!is_array($boosters)) { $boosters = []; }
        foreach ($required as $attribute=>$entries) {
            $key = (string)$attribute;
            if (!isset($boosters[$key]) || !is_array($boosters[$key])) { $boosters[$key] = []; }
            foreach ($entries as $requiredBooster) {
                $found = false;
                foreach ($boosters[$key] as &$booster) {
                    if ((int)($booster['Type'] ?? -1) === $requiredBooster['Type']) {
                        $booster['Seconds'] = -1;
                        $found = true;
                        break;
                    }
                }
                unset($booster);
                if (!$found) { $boosters[$key][] = $requiredBooster; }
            }
        }
        $json = json_encode($boosters);
        $userId = (int)$row['userId'];
        $update->bind_param('si', $json, $userId);
        $update->execute();
    }
    $db->commit();
    echo "Elite LV16 booster defaults applied to ".count($rows)." accounts.\n";
} catch (Throwable $error) {
    $db->rollback();
    throw $error;
}
