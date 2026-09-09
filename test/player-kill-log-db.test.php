<?php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$root = dirname(__DIR__);
$credentials = json_decode(file_get_contents($root.'/.local/credentials.json'), true);
$db = new mysqli('127.0.0.1', 'root', $credentials['dbPassword'], 'darkorbit_local', 3307);
$db->begin_transaction();
try {
    $db->query('INSERT INTO log_player_kills (killer_id,target_id,pushing) VALUES (7,9,0),(7,9,1)');
    $rows = $db->query('SELECT pushing FROM log_player_kills WHERE killer_id=7 AND target_id=9 ORDER BY id DESC LIMIT 2')->fetch_all(MYSQLI_NUM);
    if (count($rows) !== 2) {
        throw new RuntimeException('Kill log rows missing');
    }
    echo "PASS: strict MariaDB schema accepts both pushing values.\n";
} finally {
    $db->rollback();
}
