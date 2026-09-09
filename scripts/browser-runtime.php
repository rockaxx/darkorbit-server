<?php

function darkorbit_browser_asset($requestPath, $projectRoot) {
    $requestPath = rawurldecode($requestPath);
    if (strpos($requestPath, "\0") !== false || strpos($requestPath, '\\') !== false || strpos($requestPath, '..') !== false) {
        return null;
    }

    if ($requestPath === '/browser/ruffle-config.js') {
        $assetRoot = realpath($projectRoot . '/web');
        $relative = 'ruffle-config.js';
    } elseif (strpos($requestPath, '/browser/native/') === 0) {
        $assetRoot = realpath($projectRoot . '/web/native');
        $relative = substr($requestPath, strlen('/browser/native/'));
    } elseif (strpos($requestPath, '/browser/ruffle/') === 0) {
        $assetRoot = realpath($projectRoot . '/node_modules/@ruffle-rs/ruffle');
        $relative = substr($requestPath, strlen('/browser/ruffle/'));
    } else {
        return null;
    }

    if ($assetRoot === false || $relative === '') return null;
    $path = realpath($assetRoot . DIRECTORY_SEPARATOR . $relative);
    if ($path === false || !is_file($path) || strpos($path, $assetRoot . DIRECTORY_SEPARATOR) !== 0) return null;

    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $mimeTypes = array(
        'js' => 'text/javascript; charset=utf-8',
        'mjs' => 'text/javascript; charset=utf-8',
        'css' => 'text/css; charset=utf-8',
        'wasm' => 'application/wasm',
        'map' => 'application/json; charset=utf-8',
    );
    if (!isset($mimeTypes[$extension])) return null;

    return array('path' => $path, 'mime' => $mimeTypes[$extension]);
}

function darkorbit_inject_ruffle($html) {
    if (strpos($html, 'data-darkorbit-browser-runtime') !== false) return $html;

    $scripts = '<script data-darkorbit-browser-runtime src="/browser/ruffle-config.js"></script>' . "\n" .
        '<script src="/browser/ruffle/ruffle.js"></script>' . "\n";
    $pattern = '~(<script\b[^>]*src=["\'][^"\']*jquery\.flashembed\.js[^"\']*["\'][^>]*>)~i';
    return preg_replace($pattern, $scripts . '$1', $html, 1);
}

function darkorbit_patch_map_template($templatePath) {
    $source = @file_get_contents($templatePath);
    if ($source === false) throw new RuntimeException('Cannot read map template: ' . $templatePath);
    if (strpos($source, 'data-darkorbit-browser-runtime') !== false) return false;

    $patched = darkorbit_inject_ruffle($source);
    if ($patched === $source) {
        throw new RuntimeException('Cannot find legacy Flash embed script in map template: ' . $templatePath);
    }
    if (@file_put_contents($templatePath, $patched, LOCK_EX) === false) {
        throw new RuntimeException('Cannot write browser-enabled map template: ' . $templatePath);
    }
    return true;
}
