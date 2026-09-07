<?php
// Apply defaults for NEW accounts and explicitly reset the local test pilot.
// Run only with the game window closed, to avoid overwriting live state.
if (PHP_SAPI !== 'cli') { exit(1); }
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require __DIR__.'/starter-profile.php';
$credentials = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents(__DIR__.'/../.local/credentials.json')), true);
$db = new mysqli('127.0.0.1', 'root', $credentials['dbPassword'], 'darkorbit_local', 3307);
$db->set_charset('utf8mb4');
$statement = $db->prepare('SELECT userId FROM player_accounts WHERE username=?');
$statement->bind_param('s', $credentials['username']);
$statement->execute();
$id = (int)$statement->get_result()->fetch_assoc()['userId'];
if (!$id) { throw new RuntimeException('Test account not found.'); }
$profile = starterProfile($db);
// MariaDB DDL commits implicitly; set defaults before the data transaction.
foreach ($profile as $table=>$columns) {
    foreach ($columns as $column=>$value) {
        $value = is_array($value) || is_object($value) ? json_encode($value) : (string)$value;
        $db->query("ALTER TABLE `$table` ALTER COLUMN `$column` SET DEFAULT '".$db->real_escape_string($value)."'");
    }
}
$db->begin_transaction();
try {
    foreach ($profile as $table=>$columns) {
        foreach ($columns as $column=>$value) {
            $value = is_array($value) || is_object($value) ? json_encode($value) : (string)$value;
            $statement = $db->prepare("UPDATE `$table` SET `$column`=? WHERE userId=?");
            $statement->bind_param('si', $value, $id);
            $statement->execute();
        }
    }
    $db->query('UPDATE player_accounts SET version=0');
    $db->commit();
    echo "Full defaults installed; local pilot $id equipped.\n";
} catch (Throwable $error) { $db->rollback(); throw $error; }
