'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isOfficialUrl, isExternalUrl, isDownloadUrl, webPreferences, allowPermission } = require('../electron/policy.cjs');
const config = require('../electron/config.cjs');
const pkg = require('../package.json');

test('only exact official HTTPS origin loads in the desktop window', () => {
  assert.equal(isOfficialUrl('https://linze.lovable.app/auth'), true);
  for (const url of ['blob:https://linze.lovable.app/123', 'http://linze.lovable.app', 'https://linze.lovable.app.evil.test', 'https://evil.test/?url=https://linze.lovable.app', 'https://linze.lovable.app:444', 'https://x.linze.lovable.app', 'https://user:secret@linze.lovable.app', 'file:///C:/Windows', 'javascript:alert(1)', 'data:text/html,hello']) {
    assert.equal(isOfficialUrl(url), false, url);
  }
});
test('external links cannot invoke local commands or custom protocols', () => {
  assert.equal(isExternalUrl('https://www.vinted.fr/'), true);
  assert.equal(isExternalUrl('mailto:support@example.com'), true);
  for (const url of ['powershell:run', 'cmd:run', 'file:///C:/Windows', 'javascript:alert(1)', 'ms-settings:', 'https://user:secret@example.com', 'https://linze.lovable.app/auth']) {
    assert.equal(isExternalUrl(url), false, url);
  }
});
test('renderer stays isolated and sandboxed with no local system bridge', () => {
  const prefs = webPreferences();
  assert.equal(prefs.contextIsolation, true);
  assert.equal(prefs.sandbox, true);
  assert.equal(prefs.nodeIntegration, false);
  assert.equal(prefs.nodeIntegrationInWorker, false);
  assert.equal(prefs.nodeIntegrationInSubFrames, false);
  assert.equal(prefs.webSecurity, true);
  assert.equal(prefs.allowRunningInsecureContent, false);
  assert.equal(prefs.webviewTag, false);
  assert.equal(prefs.preload, undefined);
});
test('login storage is persistent and does not share browser profile', () => {
  assert.equal(config.sessionPartition, 'persist:listpilot-desktop');
});
test('official copy buttons can write clipboard; reading or foreign permissions denied', () => {
  assert.equal(allowPermission('clipboard-sanitized-write', 'https://linze.lovable.app/assistant'), true);
  assert.equal(allowPermission('clipboard-read', 'https://linze.lovable.app/assistant'), false);
  assert.equal(allowPermission('clipboard-sanitized-write', 'https://evil.test'), false);
  assert.equal(allowPermission('media', 'https://linze.lovable.app'), false);
});
test('website and executable updates are separate; updater disabled until configured', () => {
  assert.equal(config.websiteUrl, 'https://linze.lovable.app/');
  assert.equal(config.clientUpdatesEnabled, false);
});
test('downloads allow original-site blob ZIPs but not foreign blob or local files', () => {
  assert.equal(isDownloadUrl('blob:https://linze.lovable.app/1234'), true);
  assert.equal(isDownloadUrl('https://storage.example.com/image.jpg'), true);
  assert.equal(isDownloadUrl('blob:https://evil.test/1234'), false);
  assert.equal(isDownloadUrl('file:///C:/Windows/test.exe'), false);
});
test('Windows installer is NSIS x64 with desktop shortcut and uninstall support', () => {
  assert.equal(pkg.productName, 'ListPilot AI');
  assert.equal(pkg.build.win.target[0].target, 'nsis');
  assert.deepEqual(pkg.build.win.target[0].arch, ['x64']);
  assert.equal(pkg.build.nsis.createDesktopShortcut, 'always');
  assert.equal(pkg.build.nsis.uninstallDisplayName, 'ListPilot AI');
  assert.equal(pkg.build.nsis.deleteAppDataOnUninstall, false);
});