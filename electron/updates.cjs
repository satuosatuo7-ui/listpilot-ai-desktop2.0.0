'use strict';
const { app, dialog } = require('electron');

// Future desktop updater integration belongs in this module, in the main process.
// Not enabled: there is no configured signed release feed or signing identity yet.
// Do not claim a website reload updates this executable or silently install binaries.
async function showClientUpdateStatus(parent) {
  await dialog.showMessageBox(parent, {
    type: 'info', title: '客户端版本', message: `当前客户端版本：${app.getVersion()}`,
    detail: '客户端自动更新尚未启用。新安装包发布后，可下载并覆盖安装；网站内容更新只需重新加载。',
  });
}
module.exports = { showClientUpdateStatus };