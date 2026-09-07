<?php
// Router for the portable, loopback-only PHP server.
$root = realpath(__DIR__ . '/../.local/cms');
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (strpos($path, '..') !== false || preg_match('~(?:^|/)\.|^/files/(?!api\.php$)|^/cronjobs|\.sql$~i', $path)) {
    http_response_code(404);
    exit('Not found');
}
$file = realpath($root . $path);
if ($file && strpos($file, $root . DIRECTORY_SEPARATOR) === 0 && is_file($file)) {
    return false;
}
$_GET['p'] = trim($path, '/') ?: 'index';
require $root . '/files/redirect.php';
