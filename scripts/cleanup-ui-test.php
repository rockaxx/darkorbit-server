<?php
if (PHP_SAPI !== 'cli') exit(1);
$username = $argv[1] ?? '';
if (!preg_match('/^ui_[a-f0-9]{10}$/', $username)) throw new RuntimeException('Only UI verification accounts can be removed.');
$credentials = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents(__DIR__.'/../.local/credentials.json')), true);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli('127.0.0.1', 'root', $credentials['dbPassword'], 'darkorbit_local', 3307);
$query = $db->prepare('SELECT userId FROM player_accounts WHERE username=? AND email=?');
$email = $username.'@example.test';
$query->bind_param('ss', $username, $email);
$query->execute();
$row = $query->get_result()->fetch_assoc();
if (!$row) exit(0);
$id = (int)$row['userId'];
$db->begin_transaction();
try {
    foreach (['player_equipment'=>'userId','player_settings'=>'userId','player_titles'=>'userID','player_accounts'=>'userId'] as $table=>$column) {
        $db->query("DELETE FROM $table WHERE $column=$id");
    }
    $db->commit();
} catch (Throwable $e) { $db->rollback(); throw $e; }
echo "Temporary UI pilot removed.\n";
