'use strict';
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('node:path');
const { websiteUrl } = require('./config.cjs');
const { isOfficialUrl, isExternalUrl, isDownloadUrl, webPreferences, allowPermission } = require('./policy.cjs');
const { showClientUpdateStatus } = require('./updates.cjs');
const { collectorDeepLink, collectorFromArguments } = require('./deep-link.cjs');

let mainWindow;
let pendingImport = collectorFromArguments(process.argv);
app.setName('ListPilot AI');
app.setAppUserModelId('app.listpilot.desktop');
const hasLock = app.requestSingleInstanceLock();

async function openExternal(value) {
  if (!isExternalUrl(value)) return;
  try { await shell.openExternal(value); }
  catch { if (mainWindow) await dialog.showMessageBox(mainWindow, { type: 'warning', message: '无法打开系统浏览器，请稍后重试。' }); }
}

function attachNavigationPolicy(contents) {
  contents.on('will-navigate', (event) => {
    if (isOfficialUrl(event.url)) return;
    event.preventDefault();
    void openExternal(event.url);
  });
  contents.on('will-redirect', (event) => {
    if (isOfficialUrl(event.url)) return;
    event.preventDefault();
    if (event.isMainFrame) void openExternal(event.url);
  });
  contents.on('will-frame-navigate', (event) => {
    if (isOfficialUrl(event.url)) return;
    event.preventDefault();
    // External embedded pages are blocked rather than proxied or trusted.
    if (event.isMainFrame) void openExternal(event.url);
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.setWindowOpenHandler(({ url }) => {
    if (isOfficialUrl(url)) void contents.loadURL(url).catch(() => {});
    else void openExternal(url);
    return { action: 'deny' };
  });
}

async function loadWebsite(destination = websiteUrl) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!isOfficialUrl(destination)) throw new Error('Official website configuration invalid');
  try { await mainWindow.loadURL(destination); }
  catch { /* did-fail-load presents a retry choice without exposing raw errors. */ }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'ListPilot AI', width: 1360, height: 900, minWidth: 960, minHeight: 640,
    show: false, icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: webPreferences(),
  });
  const contents = mainWindow.webContents;
  const session = contents.session;
  attachNavigationPolicy(contents);
  session.setPermissionCheckHandler((_contents, permission, origin) => allowPermission(permission, origin));
  session.setPermissionRequestHandler((requestContents, permission, callback, details) => {
    callback(requestContents === contents && allowPermission(permission, details.requestingUrl));
  });
  session.setDevicePermissionHandler(() => false);
  // Never bypass TLS certificate errors and never disable Chromium sandbox.
  session.on('will-download', (_event, item, sourceContents) => {
    if (sourceContents !== contents || !isOfficialUrl(contents.getURL()) || !isDownloadUrl(item.getURL())) {
      item.cancel();
      return;
    }
    // Electron's standard Save As dialog: webpage cannot choose a local path.
    item.setSaveDialogOptions({ title: '保存下载文件', defaultPath: path.basename(item.getFilename()) });
    item.once('done', async (_done, state) => {
      if (state !== 'interrupted' || !mainWindow || mainWindow.isDestroyed()) return;
      await dialog.showMessageBox(mainWindow, { type: 'warning', message: '下载未完成，请重新下载。' });
    });
  });
  let showingFailure = false;
  contents.on('did-fail-load', async (_event, code, _description, _url, isMainFrame) => {
    if (!isMainFrame || code === -3 || showingFailure || !mainWindow || mainWindow.isDestroyed()) return;
    showingFailure = true;
    mainWindow.show();
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning', title: 'ListPilot AI', message: '暂时无法连接 ListPilot，请检查网络后重新加载。',
      buttons: ['重新加载', '关闭'], defaultId: 0, cancelId: 1,
    });
    showingFailure = false;
    if (response === 0) void loadWebsite();
    else mainWindow?.close();
  });
  contents.on('did-finish-load', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show(); });
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = undefined; });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'ListPilot AI', submenu: [
      { label: '重新加载网站', accelerator: 'CmdOrCtrl+R', click: () => { if (mainWindow) mainWindow.webContents.reload(); } },
      { label: '返回首页', click: () => void loadWebsite() },
      { type: 'separator' },
      { label: '客户端版本', click: () => { if (mainWindow) void showClientUpdateStatus(mainWindow); } },
      { label: '关于 ListPilot AI', click: () => { if (mainWindow) void dialog.showMessageBox(mainWindow, {
        title: 'ListPilot AI', message: `ListPilot AI ${app.getVersion()}`,
        detail: '网站内容随网站发布更新。客户端安装程序独立更新。',
      }); } },
      { type: 'separator' }, { role: 'quit', label: '退出' },
    ] },
    { label: '编辑', submenu: [
      { role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' }, { type: 'separator' },
      { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' },
      { role: 'paste', label: '粘贴' }, { role: 'selectAll', label: '全选' },
    ] },
    { label: '窗口', submenu: [
      { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' },
      { role: 'resetZoom', label: '实际大小' }, { role: 'togglefullscreen', label: '全屏' },
    ] },
  ]));
  void loadWebsite(pendingImport || websiteUrl);
  pendingImport = null;
}

if (!hasLock) app.quit();
else {
  app.enableSandbox();
  // NSIS registers the packaged executable; development registration is explicit.
  if (app.isPackaged) app.setAsDefaultProtocolClient('listpilot');
  else if (process.defaultApp && process.argv[1]) app.setAsDefaultProtocolClient('listpilot', process.execPath, [path.resolve(process.argv[1])]);
  const receiveImport = (destination) => {
    if (!destination) return;
    if (!mainWindow || mainWindow.isDestroyed()) { pendingImport = destination; return; }
    void loadWebsite(destination);
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show(); mainWindow.focus();
  };
  app.on('open-url', (event, value) => { event.preventDefault(); receiveImport(collectorDeepLink(value)); });
  app.on('second-instance', (_event, args) => {
    receiveImport(collectorFromArguments(args));
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show(); mainWindow.focus();
  });
  app.whenReady().then(async () => {
    // A local HTTP cache refresh is distinct from session/localStorage: retain login.
    const { session } = require('electron');
    await session.fromPartition(require('./config.cjs').sessionPartition).clearCache();
    createWindow();
  }).catch(() => {
    dialog.showErrorBox('ListPilot AI', '桌面程序启动未完成，请重新启动；若仍无法打开，请重新安装。');
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  // Persist browser session data without logging credentials.
  app.on('before-quit', () => {
    if (mainWindow) { mainWindow.webContents.session.flushStorageData(); void mainWindow.webContents.session.cookies.flushStore(); }
  });
}