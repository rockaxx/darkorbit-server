<?php
// Shared CMS session authentication, without rendering or modifying legacy templates.
require_once $root . '/files/config.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if (!Functions::IsLoggedIn()) {
    if ($path === '/native-session') { http_response_code(401); header('Content-Type: application/json'); echo '{"error":"Login required"}'; }
    else { header('Location: /'); }
    exit;
}
if ($path === '/native-session') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('userId' => (int)$_SESSION['account']['id'], 'sessionId' => $_SESSION['account']['session']));
    exit;
}
session_write_close();
header('Content-Type: text/html; charset=utf-8');
readfile($projectRoot . '/web/native/index.html');
exit;
