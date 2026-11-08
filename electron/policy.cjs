'use strict';
const { officialOrigin } = require('./config.cjs');

function parseUrl(value) {
  try { return new URL(value); } catch { return null; }
}

function isOfficialUrl(value) {
  const url = parseUrl(value);
  return Boolean(url && url.protocol === 'https:' && url.origin === officialOrigin && !url.username && !url.password);
}

function isExternalUrl(value) {
  const url = parseUrl(value);
  return Boolean(url && ['https:', 'http:', 'mailto:'].includes(url.protocol) &&
    !url.username && !url.password && !isOfficialUrl(value));
}

function isOfficialBlob(value) {
  const url = parseUrl(value);
  return Boolean(url && url.protocol === 'blob:' && isOfficialUrl(url.pathname));
}

function isDownloadUrl(value) {
  const url = parseUrl(value);
  return Boolean(isOfficialBlob(value) || (url && url.protocol === 'https:' && !url.username && !url.password));
}

function webPreferences() {
  return {
    partition: require('./config.cjs').sessionPartition,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    webviewTag: false,
    navigateOnDragDrop: false,
    // Intentionally no preload or renderer-to-system IPC bridge.
  };
}

function allowPermission(permission, origin) {
  // Support existing Copy buttons, but never grant automatic clipboard reading.
  return permission === 'clipboard-sanitized-write' && isOfficialUrl(origin);
}

module.exports = { isOfficialUrl, isExternalUrl, isOfficialBlob, isDownloadUrl, webPreferences, allowPermission };