import { Monitor, MonitorSetting, MonitorCapabilities } from '../monitor-types';

interface ElectronAPI {
  getMonitors: () => Promise<Monitor[]>;
  getMonitorSettings: (monitorId: string) => Promise<MonitorSetting[]>;
  setMonitorSetting: (monitorId: string, settingId: string, value: number) => Promise<MonitorSetting | null>;
  resetMonitorSettings: (monitorId: string) => Promise<MonitorSetting[]>;
  getMonitorCapabilities: (monitorId: string) => Promise<MonitorCapabilities>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateError: (callback: (error: { message: string }) => void) => () => void;
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  // Enterprise APIs
  getProfiles: () => Promise<import('../monitor-types').MonitorProfile[]>;
  saveProfile: (profile: import('../monitor-types').MonitorProfile) => Promise<import('../monitor-types').MonitorProfile>;
  deleteProfile: (profileId: string) => Promise<void>;
  applyProfile: (profileId: string, monitorIds: string[]) => Promise<{ applied: number }>;
  getSchedules: () => Promise<import('../monitor-types').MonitorSchedule[]>;
  saveSchedule: (schedule: import('../monitor-types').MonitorSchedule) => Promise<import('../monitor-types').MonitorSchedule>;
  deleteSchedule: (scheduleId: string) => Promise<void>;
  getAuditLog: (limit?: number) => Promise<import('../monitor-types').AuditLogEntry[]>;
  logAudit: (entry: import('../monitor-types').AuditLogEntry) => Promise<void>;
  getEnterpriseConfig: () => Promise<import('../monitor-types').EnterpriseConfig>;
  saveEnterpriseConfig: (config: import('../monitor-types').EnterpriseConfig) => Promise<import('../monitor-types').EnterpriseConfig>;
}

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}