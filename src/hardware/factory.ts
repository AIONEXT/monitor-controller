import { Monitor, MonitorSetting, MonitorCapabilities } from '../monitor-types';
import { WindowsMonitorBackend } from './windows-backend';
import { LinuxMonitorBackend } from './linux-backend';
import { MacOSMonitorBackend } from './macos-backend';
import { getPlatform } from './platform-detector';

export interface MonitorBackend {
  getMonitors(): Promise<Monitor[]>;
  getSettings(monitorId: string): Promise<MonitorSetting[]>;
  setSetting(monitorId: string, settingId: string, value: number): Promise<MonitorSetting | null>;
  resetToDefaults(monitorId: string): Promise<MonitorSetting[]>;
  getCapabilities(monitorId: string): Promise<MonitorCapabilities>;
}

let backendInstance: MonitorBackend | null = null;

export function getMonitorBackend(): MonitorBackend {
  if (backendInstance) return backendInstance;

  const platform = getPlatform();
  
  switch (platform) {
    case 'win32':
      backendInstance = new WindowsMonitorBackend();
      break;
    case 'linux':
      backendInstance = new LinuxMonitorBackend();
      break;
    case 'darwin':
      backendInstance = new MacOSMonitorBackend();
      break;
    default:
      backendInstance = new MacOSMonitorBackend();
  }

  return backendInstance;
}

export function resetBackend(): void {
  backendInstance = null;
}