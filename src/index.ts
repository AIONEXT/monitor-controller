import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { MonitorManager } from './monitor-manager';
import { setupAutoUpdater } from './auto-updater';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

log.initialize({ preload: true });
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const monitorManager = new MonitorManager();

// eslint-disable-next-line @typescript-eslint/no-require-imports
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    height: 760,
    width: 1150,
    minHeight: 640,
    minWidth: 950,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f1a',
      symbolColor: '#eaeaea',
      height: 38,
    },
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0f0f1a',
    show: false,
    icon: './assets/icon.ico',
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    setupAutoUpdater(mainWindow);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

ipcMain.handle('get-monitors', async () => {
  try {
    return await monitorManager.getMonitors();
  } catch (error) {
    log.error('Failed to get monitors:', error);
    throw error;
  }
});

ipcMain.handle('get-monitor-settings', async (_event, monitorId: string) => {
  try {
    return await monitorManager.getSettings(monitorId);
  } catch (error) {
    log.error('Failed to get monitor settings:', error);
    throw error;
  }
});

ipcMain.handle('set-monitor-setting', async (_event, monitorId: string, settingId: string, value: number) => {
  try {
    return await monitorManager.setSetting(monitorId, settingId, value);
  } catch (error) {
    log.error('Failed to set monitor setting:', error);
    throw error;
  }
});

ipcMain.handle('reset-monitor-settings', async (_event, monitorId: string) => {
  try {
    return await monitorManager.resetToDefaults(monitorId);
  } catch (error) {
    log.error('Failed to reset monitor settings:', error);
    throw error;
  }
});

ipcMain.handle('get-monitor-capabilities', async (_event, monitorId: string) => {
  try {
    return await monitorManager.getCapabilities(monitorId);
  } catch (error) {
    log.error('Failed to get monitor capabilities:', error);
    throw error;
  }
});

ipcMain.handle('app-get-version', () => app.getVersion());
ipcMain.handle('app-check-updates', () => autoUpdater.checkForUpdates());
ipcMain.handle('app-download-update', () => autoUpdater.downloadUpdate());
ipcMain.handle('app-quit-and-install', () => autoUpdater.quitAndInstall());

ipcMain.on('window-minimize', () => {
  const win = BrowserWindow.getFocusedWindow();
  win?.minimize();
});

ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  const win = BrowserWindow.getFocusedWindow();
  win?.close();
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});