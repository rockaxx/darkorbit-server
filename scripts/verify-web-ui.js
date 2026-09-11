// Uses a temporary pilot; does not rotate an existing player's game session.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const puppeteer = require('puppeteer-core');
const root = path.join(__dirname, '..');
const origin = process.env.DO_WEB_ORIGIN || 'http://127.0.0.1';
const username = 'ui_' + crypto.randomBytes(5).toString('hex');
const password = crypto.randomBytes(12).toString('hex');

(async () => {
  const browser = await puppeteer.launch({executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
  const errors = [], broken = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({width:1440,height:1000});
    await page.goto(origin, {waitUntil:'networkidle0'});
    assert.ok(await page.$('.orbit-landing-copy'), 'New landing page is installed');
    await page.screenshot({path:path.join(root,'.local/logs/ui-login-desktop.png'), fullPage:true});
    await page.setViewport({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Landing fits mobile');
    await page.screenshot({path:path.join(root,'.local/logs/ui-login-mobile.png'),fullPage:true});
    await page.setViewport({width:1440,height:1000});
    await page.click('a[href="#register"]');
    await page.waitForSelector('#r-username', {visible:true});
    await page.type('#r-username', username);
    await page.type('#r-email', username+'@example.test');
    await page.type('#r-password', password);
    await page.type('#r-password-confirm', password);
    await page.click('#register input[name=agreement] + span', {offset:{x:5,y:10}});
    assert.equal(await page.$eval('#register input[name=agreement]',input=>input.checked),true,'Agreement checkbox works');
    const registered = page.waitForResponse(response => response.url().includes('/api/') && response.request().method() === 'POST');
    await page.click('#register button');
    const registration = await (await registered).json();
    console.log('Registration response:',registration.message);
    assert.match(registration.message, /(created|successfully registered)/i, 'Registration works through the redesigned form');
    await page.click('.tabs a[href="#login"]');
    await page.waitForSelector('#l-username', {visible:true});
    await page.type('#l-username',username);
    await page.type('#l-password',password);
    await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#login button')]);
    assert.equal(await page.$('#login'), null, 'Login succeeds');
    for (const route of ['/', '/ships', '/shop', '/settings', '/clan/join', '/clan/found', '/clan/company', '/skill-tree', '/equipment']) {
      await page.goto(origin+route, {waitUntil:'networkidle0'});
      assert.ok(await page.$('.orbit-sidebar'), route+' has navigation');
      assert.equal(await page.evaluate(() => document.body.innerText.includes('Fatal error')), false, route+' has no PHP error');
      const missing = await page.evaluate(async () => {
        await Promise.all(Array.from(document.images).map(img => {
          img.loading='eager';
          return img.decode().catch(() => {});
        }));
        return Array.from(document.images).filter(img=>!img.naturalWidth).map(img=>img.getAttribute('src'));
      });
      if (missing.length) broken.push({route,missing});
      if (route === '/ships') {
        assert.ok(await page.$$eval('.ship', items=>items.length>=5),'Fleet has ships');
        assert.equal(await page.$$eval('.ship',items=>new Set(items.map(item=>item.id)).size === items.length),true,'Fleet is deduplicated');
        assert.equal(await page.$$eval('.ship img',items=>items.some(img=>img.src.includes('unknown'))),false,'Every owned ship has its actual artwork');
      }
      await page.screenshot({path:path.join(root,'.local/logs/ui-'+(route === '/'?'home':route.slice(1).replaceAll('/','-'))+'-desktop.png'),fullPage:true});
      console.log('DESKTOP',route, missing.length ? 'broken images: '+JSON.stringify(missing) : 'images OK');
      if (route === '/ships') {
        await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('#ship_vengeance_design_pusat')]);
        assert.ok(page.url().endsWith('/equipment'),'Selecting a ship opens equipment');
        await page.goto(origin+'/ships',{waitUntil:'networkidle0'});
        assert.equal(await page.$eval('.ship.active',el=>el.id),'ship_vengeance_design_pusat','Ship selection persists on the server');
      }
      if (route === '/shop') {
        await page.click('.buy');
        await page.waitForSelector('#modal.open',{visible:true});
        assert.match(await page.$eval('#modal p',el=>el.textContent),/Apis/,'Buy dialog identifies the selected item');
        await page.click('#modal .modal-close');
      }
    }
    await page.setViewport({width:390,height:844});
    for (const route of ['/', '/ships','/shop','/settings','/clan/join','/clan/company','/skill-tree']) {
      await page.goto(origin+route,{waitUntil:'networkidle0'});
      const overflow = await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
      assert.ok(overflow.scroll<=overflow.width+1,route+' must fit mobile: '+JSON.stringify(overflow));
      await page.screenshot({path:path.join(root,'.local/logs/ui-'+(route==='/'?'home':route.slice(1).replaceAll('/','-'))+'-mobile.png'),fullPage:true});
      console.log('MOBILE',route,'fits viewport');
    }
    await page.click('.orbit-menu');
    assert.equal(await page.$eval('.orbit-menu',el=>el.getAttribute('aria-expanded')),'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('.orbit-menu',el=>el.getAttribute('aria-expanded')),'false');
    assert.equal(await page.$eval('.orbit-sidebar',el=>getComputedStyle(el).visibility),'hidden','Closed mobile menu is inaccessible to keyboard focus');
    await page.setViewport({width:844,height:390});
    assert.equal(await page.$eval('.orbit-sidebar',el=>getComputedStyle(el).overflowY),'auto','Sidebar scrolls on short screens');
    assert.deepEqual(broken,[], 'All page images load');
    assert.deepEqual(errors,[], 'No browser JavaScript errors');
    console.log('PASS: registration, login, desktop pages, fleet artwork, mobile layouts and navigation.');
  } finally {
    await browser.close();
    execFileSync(path.join(root,'.local/php/php.exe'),[path.join(__dirname,'cleanup-ui-test.php'), username],{stdio:'inherit'});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
