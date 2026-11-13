'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { collectorDeepLink, collectorFromArguments } = require('../electron/deep-link.cjs');
const payload = { pageUrl: 'https://www.vinted.co.uk/items/123', images: ['https://images.example.com/product.jpg'], fields: { title: 'Visible title' } };
const hash = `#lp-import=${encodeURIComponent(JSON.stringify(payload))}`;
test('collector links preserve selected data and target only the official import page', () => {
  const link = `listpilot://collector-import${hash}`;
  assert.equal(collectorDeepLink(link), `https://linze.lovable.app/collector-import${hash}`);
  assert.equal(collectorFromArguments(['app.exe', '--flag', link]), `https://linze.lovable.app/collector-import${hash}`);
});
test('rejects alternate destinations, credentials, commands and malformed payloads', () => {
  for (const link of [`listpilot://evil.test${hash}`, `listpilot://collector-import/other${hash}`, `listpilot://user@collector-import${hash}`, `listpilot://collector-import?url=https://evil.test${hash}`, `https://linze.lovable.app/collector-import${hash}`, 'file:///C:/Windows', 'listpilot://collector-import#lp-import=broken']) {
    assert.equal(collectorDeepLink(link), null);
  }
  for (const data of [{ ...payload, images: [] }, { ...payload, images: ['file:///C:/Windows'] }, { ...payload, pageUrl: 'https://user:password@example.com' }, { ...payload, images: Array(81).fill(payload.images[0]) }]) {
    assert.equal(collectorDeepLink(`listpilot://collector-import#lp-import=${encodeURIComponent(JSON.stringify(data))}`), null);
  }
});
test('rejects links beyond the Windows-safe handoff length', () => {
  assert.equal(collectorDeepLink(`listpilot://collector-import${hash}${'a'.repeat(24000)}`), null);
});