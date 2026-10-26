import { ipcMain } from 'electron';
import { EnterpriseStore } from './enterprise-store';
import { MonitorManager } from './monitor-manager';
import log from 'electron-log';

/**
 * Registers enterprise IPC handlers (profiles, schedules, audit log, config)
 * on the main process.
 */
export function registerEnterpriseHandlers(monitorManager: MonitorManager): void {
  const store = new EnterpriseStore();

  ipcMain.handle('enterprise-get-profiles', () => {
    try {
      return store.getProfiles();
    } catch (error) {
      log.error('enterprise-get-profiles failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-save-profile', (_e, profile) => {
    try {
      return store.saveProfile(profile);
    } catch (error) {
      log.error('enterprise-save-profile failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-delete-profile', (_e, profileId: string) => {
    try {
      store.deleteProfile(profileId);
    } catch (error) {
      log.error('enterprise-delete-profile failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-apply-profile', async (_e, profileId: string, monitorIds: string[]) => {
    try {
      const profile = store.getProfiles().find(p => p.id === profileId);
      if (!profile) throw new Error(`Profile ${profileId} not found`);

      const monitors = await monitorManager.getMonitors(true);
      let applied = 0;
      for (const monitor of monitors) {
        if (monitorIds.length > 0 && !monitorIds.includes(monitor.id)) continue;
        const monitorSettings = profile.settings[monitor.id] || profile.settings['*'];
        if (!monitorSettings) continue;
        for (const [settingId, value] of Object.entries(monitorSettings)) {
          const cap = monitor.capabilities[settingId];
          if (!cap || !cap.supported) continue;
          try {
            await monitorManager.setSetting(monitor.id, settingId, value);
            applied++;
          } catch (err) {
            log.warn(`Failed to apply ${settingId}=${value} to ${monitor.id}:`, err);
          }
        }
      }
      log.info(`Profile ${profile.name} applied: ${applied} setting(s) updated`);
      return { applied };
    } catch (error) {
      log.error('enterprise-apply-profile failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-get-schedules', () => {
    try {
      return store.getSchedules();
    } catch (error) {
      log.error('enterprise-get-schedules failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-save-schedule', (_e, schedule) => {
    try {
      return store.saveSchedule(schedule);
    } catch (error) {
      log.error('enterprise-save-schedule failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-delete-schedule', (_e, scheduleId: string) => {
    try {
      store.deleteSchedule(scheduleId);
    } catch (error) {
      log.error('enterprise-delete-schedule failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-get-audit-log', (_e, limit?: number) => {
    try {
      return store.getAuditLog(limit);
    } catch (error) {
      log.error('enterprise-get-audit-log failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-log-audit', (_e, entry) => {
    try {
      store.appendAudit(entry);
    } catch (error) {
      log.error('enterprise-log-audit failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-get-config', () => {
    try {
      return store.getConfig();
    } catch (error) {
      log.error('enterprise-get-config failed:', error);
      throw error;
    }
  });

  ipcMain.handle('enterprise-save-config', (_e, config) => {
    try {
      return store.saveConfig(config);
    } catch (error) {
      log.error('enterprise-save-config failed:', error);
      throw error;
    }
  });

  log.info('Enterprise IPC handlers registered');
}
