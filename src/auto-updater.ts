import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    mainWindow.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('No update available:', info.version);
    mainWindow.webContents.send('update-status', { status: 'no-update', version: info.version });
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-updater error:', error);
    mainWindow.webContents.send('update-error', { message: error.message });
  });

  autoUpdater.on('download-progress', (progress) => {
    log.info(`Download progress: ${Math.round(progress.percent)}%`);
    mainWindow.webContents.send('update-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded, will install on quit:', info.version);
    mainWindow.webContents.send('update-downloaded', info);
  });

  autoUpdater.checkForUpdates().catch((error) => {
    log.error('Failed to check for updates:', error);
  });
}

export function configureUpdater(feedUrl: string): void {
  autoUpdater.setFeedURL(feedUrl);
}