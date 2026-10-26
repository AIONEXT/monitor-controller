import { MonitorProfile, MonitorSchedule, AuditLogEntry, EnterpriseConfig } from '../monitor-types';

/**
 * Enterprise service for managing profiles, schedules, and audit logging.
 * Calls go through the secure preload bridge (window.electronAPI), which
 * forwards to the main process where data persists in userData/enterprise.
 */
export class EnterpriseService {
  private static instance: EnterpriseService;
  private auditLog: AuditLogEntry[] = [];
  private config: EnterpriseConfig = {
    enableAuditLogging: true,
    enableRemoteManagement: false,
    requireAdminForChanges: false,
    allowedBrands: [],
    maxMonitors: 16,
    profileSharingEnabled: true,
  };

  static getInstance(): EnterpriseService {
    if (!EnterpriseService.instance) {
      EnterpriseService.instance = new EnterpriseService();
    }
    return EnterpriseService.instance;
  }

  private api() {
    if (!window.electronAPI) {
      throw new Error('Electron API bridge unavailable');
    }
    return window.electronAPI;
  }

  // ---- Profiles ----
  async getProfiles(): Promise<MonitorProfile[]> {
    return this.api().getProfiles();
  }

  async saveProfile(profile: MonitorProfile): Promise<MonitorProfile> {
    return this.api().saveProfile(profile);
  }

  async deleteProfile(profileId: string): Promise<void> {
    return this.api().deleteProfile(profileId);
  }

  async applyProfile(profileId: string, monitorIds: string[]): Promise<{ applied: number }> {
    return this.api().applyProfile(profileId, monitorIds);
  }

  // ---- Schedules ----
  async getSchedules(): Promise<MonitorSchedule[]> {
    return this.api().getSchedules();
  }

  async saveSchedule(schedule: MonitorSchedule): Promise<MonitorSchedule> {
    return this.api().saveSchedule(schedule);
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    return this.api().deleteSchedule(scheduleId);
  }

  // ---- Audit Log ----
  async getAuditLog(limit = 200): Promise<AuditLogEntry[]> {
    return this.api().getAuditLog(limit);
  }

  async logChange(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const full: AuditLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };
    this.auditLog.push(full);
    // Keep local buffer bounded
    if (this.auditLog.length > 500) this.auditLog = this.auditLog.slice(-500);
    return this.api().logAudit(full);
  }

  // ---- Config ----
  async getConfig(): Promise<EnterpriseConfig> {
    return this.api().getEnterpriseConfig();
  }

  async saveConfig(config: EnterpriseConfig): Promise<EnterpriseConfig> {
    this.config = config;
    return this.api().saveEnterpriseConfig(config);
  }

  getConfigSync(): EnterpriseConfig {
    return this.config;
  }
}

export const enterprise = EnterpriseService.getInstance();
