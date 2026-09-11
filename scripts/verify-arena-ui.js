const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const root = path.join(__dirname, '..');
const credentials = JSON.parse(fs.readFileSync(path.join(root, '.local/credentials.json'), 'utf8').replace(/^\uFEFF/, ''));

(async () => {
  const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  try {
    const page = await browser.newPage();
    await page.setViewport({width: 1280, height: 850});
    await page.goto('http://127.0.0.1/', {waitUntil: 'networkidle0'});
    await page.type('#l-username', credentials.username);
    await page.type('#l-password', credentials.password);
    await Promise.all([page.waitForNavigation({waitUntil: 'networkidle0'}), page.click('#login button')]);
    await page.goto('http://127.0.0.1/map-revolution', {waitUntil: 'networkidle0'});
    await page.waitForSelector('#arena-toggle', {visible: true});
    await page.$eval('#arena-toggle', button => button.click());
    assert.equal(await page.$eval('#arena-panel', node => node.getAttribute('aria-hidden')), 'false');
    const api = await page.evaluate(async nickname => {
      const response = await fetch('/arena-api.php', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams({action: 'invite', nickname})});
      return response.json();
    }, credentials.username);
    assert.equal(api.status, false, 'self invitation must be rejected');
    assert.match(api.message, /sám seba/);
    await page.screenshot({path: path.join(root, '.local/logs/arena-ui.png')});
    console.log('PASS: authenticated map shows 1v1 overlay and rejects self invites.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
