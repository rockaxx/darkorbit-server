const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const root = path.join(__dirname, '..');
const credentials = JSON.parse(fs.readFileSync(path.join(root, '.local/credentials.json'), 'utf8').replace(/^\uFEFF/, ''));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1/', {waitUntil: 'networkidle0'});
    await page.type('#l-username', credentials.username);
    await page.type('#l-password', credentials.password);
    await Promise.all([page.waitForNavigation({waitUntil: 'networkidle0'}), page.click('#login button')]);
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
    assert.ok(eliteItems.length > 0 && eliteItems.every(item => item.LV === 16), 'BO2/LF-4 are not LV16');
    assert.equal(eliteDrones.length, 10, 'Iris/Apis/Zeus set is incomplete');
    assert.ok(eliteDrones.every(drone => drone.LV === 16), 'Drones are not LV16');
    for (const lootId of [0, 2, 3, 4, 8]) {
      const info = payload.data.ret.itemInfo.find(item => item.L === lootId);
      assert.ok(info && info.levels.length === 17, `Item ${lootId} lacks levels 0-16`);
    }
    console.log(`PASS: live Hangar reports ${eliteItems.length} LF-4/BO2 items and 10 drones at LV16.`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
