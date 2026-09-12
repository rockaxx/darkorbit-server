const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const puppeteer = require('puppeteer-core');

const root = path.join(__dirname, '..');
const php = path.join(root, '.local/php/php.exe');
const sessionId = `hangarverify${process.pid}`;
const sessionCode = `session_id('${sessionId}'); chdir('.local/cms/flashAPI'); require_once('../files/config.php'); $db=Database::GetInstance(); $a=$db->query('SELECT userId,sessionId FROM player_accounts ORDER BY userId LIMIT 1')->fetch_assoc(); $_SESSION['account']=['id'=>$a['userId'],'session'=>$a['sessionId']]; session_write_close();`;
const sessionResult = spawnSync(php, ['-r', sessionCode], {cwd: root, encoding: 'utf8'});
assert.equal(sessionResult.status, 0, sessionResult.stderr || 'Could not create Hangar verification session');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  try {
    const page = await browser.newPage();
    await page.setCookie({name: 'PHPSESSID', value: sessionId, url: 'http://127.0.0.1/'});
    await page.goto('http://127.0.0.1/', {waitUntil: 'domcontentloaded'});
    const payload = await page.evaluate(async () => {
      const body = new URLSearchParams({
        action: 'init',
        params: btoa(JSON.stringify({nr: 1}))
      });
      const response = await fetch('/flashAPI/inventory.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body
      });
      return JSON.parse(atob(await response.text()));
    });
    assert.equal(payload.isError, 0, 'Hangar inventory init failed');
    const items = payload.data.ret.items;
    const eliteItems = items.filter(item => item.L === 0 || item.L === 8);
    const eliteDrones = payload.data.ret.hangars[0].general.drones.filter(drone => [2, 3, 4].includes(drone.L));
    const configs = payload.data.ret.hangars[0].config;
    assert.ok(eliteItems.length > 0 && eliteItems.every(item => item.LV === 16), 'BO2/LF-4 are not LV16');
    assert.equal(eliteDrones.length, 10, 'Iris/Apis/Zeus set is incomplete');
    assert.ok(eliteDrones.every(drone => drone.LV === 16), 'Drones are not LV16');
    assert.equal(payload.data.ret.hangars[0].general.pet, undefined, 'Legacy Flash Hangar must not receive general.pet');
    for (const configId of ['1', '2']) {
      assert.equal(configs[configId].pet, undefined, `Legacy Flash Hangar config ${configId} must not receive config.pet`);
    }
    for (const lootId of [0, 2, 3, 4, 8]) {
      const info = payload.data.ret.itemInfo.find(item => item.L === lootId);
      assert.ok(info && info.levels.length === 17, `Item ${lootId} lacks levels 0-16`);
    }
    console.log(`PASS: live Hangar reports ${eliteItems.length} LF-4/BO2 items and 10 drones with a Flash-compatible payload.`);
  } finally {
    await browser.close();
    spawnSync(php, ['-r', `session_id('${sessionId}'); session_start(); session_destroy();`], {cwd: root});
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
