import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { UpdateInfo, UpdateProgress } from './types/electron-api';

contextBridge.exposeInMainWorld('electronAPI', {
  getMonitors: () => ipcRenderer.invoke('get-monitors'),
  getMonitorSettings: (monitorId: string) => ipcRenderer.invoke('get-monitor-settings', monitorId),
  setMonitorSetting: (monitorId: string, settingId: string, value: number) =>
    ipcRenderer.invoke('set-monitor-setting', monitorId, settingId, value),
  resetMonitorSettings: (monitorId: string) => ipcRenderer.invoke('reset-monitor-settings', monitorId),
  getMonitorCapabilities: (monitorId: string) => ipcRenderer.invoke('get-monitor-capabilities', monitorId),
  getAppVersion: () => ipcRenderer.invoke('app-get-version'),
  checkForUpdates: () => ipcRenderer.invoke('app-check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('app-download-update'),
  quitAndInstall: () => ipcRenderer.invoke('app-quit-and-install'),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    const listener = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-available', listener);
    return () => ipcRenderer.removeListener('update-available', listener);
  },
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
    const listener = (_event: IpcRendererEvent, info: UpdateInfo) => callback(info);
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateError: (callback: (error: { message: string }) => void) => {
    const listener = (_event: IpcRendererEvent, error: { message: string }) => callback(error);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => {
    const listener = (_event: IpcRendererEvent, progress: UpdateProgress) => callback(progress);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
});