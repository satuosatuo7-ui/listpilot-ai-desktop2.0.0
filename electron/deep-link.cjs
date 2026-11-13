'use strict';
const { officialOrigin } = require('./config.cjs');

// Keep below Windows' command-line limit; never accept a destination supplied by a page.
const MAX_LINK_LENGTH = 24000;
function safePublicUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
function collectorDeepLink(value) {
  if (typeof value !== 'string' || value.length > MAX_LINK_LENGTH) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'listpilot:' || url.hostname !== 'collector-import' ||
      !['', '/'].includes(url.pathname) || url.port || url.username || url.password || url.search ||
      !url.hash.startsWith('#lp-import=')) return null;
    const data = JSON.parse(decodeURIComponent(url.hash.slice(11)));
    if (!data || !safePublicUrl(data.pageUrl) || !Array.isArray(data.images) ||
      data.images.length < 1 || data.images.length > 80 || !data.images.every(safePublicUrl)) return null;
    return `${officialOrigin}/collector-import${url.hash}`;
  } catch { return null; }
}
function collectorFromArguments(args) {
  if (!Array.isArray(args)) return null;
  for (const arg of args) {
    const destination = collectorDeepLink(arg);
    if (destination) return destination;
  }
  return null;
}
module.exports = { collectorDeepLink, collectorFromArguments, MAX_LINK_LENGTH };