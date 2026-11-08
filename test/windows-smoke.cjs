'use strict';
const { _electron: electron } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const app = await electron.launch({
    executablePath: path.resolve('release/win-unpacked/ListPilot AI.exe'),
    timeout: 90000,
  });
  try {
    const page = await app.firstWindow();
    await page.waitForURL('https://linze.lovable.app/auth', { timeout: 90000 });
    await page.locator('input[type="email"]').waitFor({ timeout: 60000 });
    await page.locator('input[type="password"]').waitFor();
    if (await page.evaluate(() => typeof window.require !== 'undefined' || typeof window.process !== 'undefined')) {
      throw new Error('Renderer unexpectedly has Node access');
    }
    const preferences = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
    if (!preferences.sandbox || !preferences.contextIsolation || preferences.nodeIntegration) throw new Error('Unsafe renderer preferences');
    await fs.mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/windows-login.png' });
    await fs.writeFile('test-results/launch-check.txt', 'Windows packaged application opened official account/password login. Sandbox/isolation on, Node off. No authenticated business flow tested.\n');
    console.log('Packaged Windows login and renderer isolation verified.');
  } finally { await app.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });