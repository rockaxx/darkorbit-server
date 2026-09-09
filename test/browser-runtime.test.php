<?php
require_once __DIR__ . '/../scripts/browser-runtime.php';

function check($condition, $message) {
    if (!$condition) {
        fwrite(STDERR, "FAIL: $message\n");
        exit(1);
    }
}

$root = realpath(__DIR__ . '/..');

$config = darkorbit_browser_asset('/browser/ruffle-config.js', $root);
check($config !== null, 'tracked Ruffle config resolves');
check($config['mime'] === 'text/javascript; charset=utf-8', 'config uses JavaScript MIME');
check(realpath($config['path']) === realpath($root . '/web/ruffle-config.js'), 'config stays under tracked web root');

$runtime = darkorbit_browser_asset('/browser/ruffle/ruffle.js', $root);
check($runtime !== null, 'pinned Ruffle runtime resolves');
check($runtime['mime'] === 'text/javascript; charset=utf-8', 'runtime uses JavaScript MIME');

$wasmName = null;
foreach (scandir($root . '/node_modules/@ruffle-rs/ruffle') as $name) {
    if (substr($name, -5) === '.wasm') { $wasmName = $name; break; }
}
check($wasmName !== null, 'pinned Ruffle package contains WASM');
$wasm = darkorbit_browser_asset('/browser/ruffle/' . $wasmName, $root);
check($wasm !== null && $wasm['mime'] === 'application/wasm', 'WASM uses application/wasm MIME');

check(darkorbit_browser_asset('/browser/ruffle/../../package.json', $root) === null, 'traversal is rejected');
check(darkorbit_browser_asset('/browser/ruffle/missing.js', $root) === null, 'missing asset is rejected');
check(darkorbit_browser_asset('/browser/ruffle/package.json', $root) === null, 'non-runtime extension is rejected');

$legacy = '<html><head><script src="/js/darkorbit/jquery.flashembed.js"></script></head></html>';
$injected = darkorbit_inject_ruffle($legacy);
check(substr_count($injected, 'data-darkorbit-browser-runtime') === 1, 'runtime marker is injected once');
check(strpos($injected, '/browser/ruffle-config.js') < strpos($injected, '/browser/ruffle/ruffle.js'), 'config loads before Ruffle');
check(strpos($injected, '/browser/ruffle/ruffle.js') < strpos($injected, 'jquery.flashembed.js'), 'Ruffle loads before legacy embed');
check(darkorbit_inject_ruffle($injected) === $injected, 'injection is idempotent');
check(darkorbit_inject_ruffle('<html><body>unrelated</body></html>') === '<html><body>unrelated</body></html>', 'unrelated HTML is unchanged');

$temporary = tempnam(sys_get_temp_dir(), 'darkorbit-map-');
$fixture = '<head><script src="/js/darkorbit/jquery.flashembed.js"></script></head>';
file_put_contents($temporary, $fixture);
check(darkorbit_patch_map_template($temporary) === true, 'legacy map template is patched');
$patched = file_get_contents($temporary);
check(substr_count($patched, 'data-darkorbit-browser-runtime') === 1, 'template receives one runtime marker');
check(darkorbit_patch_map_template($temporary) === false, 'second template patch is a no-op');
check(file_get_contents($temporary) === $patched, 'idempotent patch preserves bytes');
unlink($temporary);

$invalid = tempnam(sys_get_temp_dir(), 'darkorbit-map-');
file_put_contents($invalid, '<html>no legacy embed</html>');
try {
    darkorbit_patch_map_template($invalid);
    check(false, 'invalid template must throw');
} catch (RuntimeException $error) {
    check(strpos($error->getMessage(), 'legacy Flash embed script') !== false, 'invalid template error is actionable');
}
unlink($invalid);

fwrite(STDOUT, "PASS: browser runtime asset isolation, MIME types, and injection order.\n");
