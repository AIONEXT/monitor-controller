import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { MonitorProfile, MonitorSchedule, AuditLogEntry, EnterpriseConfig } from './monitor-types';

/**
 * Main-process persistence for enterprise features (profiles, schedules,
 * audit log, config). Data is stored as JSON files under userData.
 */
export class EnterpriseStore {
  private dataDir: string;
  private profilesFile: string;
  private schedulesFile: string;
  private auditFile: string;
  private configFile: string;

  constructor() {
    this.dataDir = path.join(app.getPath('userData'), 'enterprise');
    this.profilesFile = path.join(this.dataDir, 'profiles.json');
    this.schedulesFile = path.join(this.dataDir, 'schedules.json');
    this.auditFile = path.join(this.dataDir, 'audit-log.json');
    this.configFile = path.join(this.dataDir, 'config.json');
    this.ensureDir();
  }

  private ensureDir(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (err) {
      console.error('Failed to create enterprise data dir:', err);
    }
  }

  private readJson<T>(file: string, fallback: T): T {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
      }
    } catch (err) {
      console.error(`Failed to read ${file}:`, err);
    }
    return fallback;
  }

  private writeJson(file: string, data: unknown): void {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`Failed to write ${file}:`, err);
      throw err;
    }
  }

  // ---- Profiles ----
  getProfiles(): MonitorProfile[] {
    return this.readJson<MonitorProfile[]>(this.profilesFile, []);
  }

  saveProfile(profile: MonitorProfile): MonitorProfile {
    const profiles = this.getProfiles();
    const idx = profiles.findIndex(p => p.id === profile.id);
    profile.updatedAt = Date.now();
    if (idx >= 0) {
      profiles[idx] = profile;
    } else {
      profiles.push(profile);
    }
    this.writeJson(this.profilesFile, profiles);
    return profile;
  }

  deleteProfile(profileId: string): void {
    const profiles = this.getProfiles().filter(p => p.id !== profileId);
    this.writeJson(this.profilesFile, profiles);
  }

  // ---- Schedules ----
  getSchedules(): MonitorSchedule[] {
    return this.readJson<MonitorSchedule[]>(this.schedulesFile, []);
  }

  saveSchedule(schedule: MonitorSchedule): MonitorSchedule {
    const schedules = this.getSchedules();
    const idx = schedules.findIndex(s => s.id === schedule.id);
    if (idx >= 0) {
      schedules[idx] = schedule;
    } else {
      schedules.push(schedule);
    }
    this.writeJson(this.schedulesFile, schedules);
    return schedule;
  }

  deleteSchedule(scheduleId: string): void {
    const schedules = this.getSchedules().filter(s => s.id !== scheduleId);
    this.writeJson(this.schedulesFile, schedules);
  }

  // ---- Audit Log ----
  getAuditLog(limit = 200): AuditLogEntry[] {
    const log = this.readJson<AuditLogEntry[]>(this.auditFile, []);
    return log.slice(-limit);
  }

  appendAudit(entry: AuditLogEntry): void {
    const log = this.readJson<AuditLogEntry[]>(this.auditFile, []);
    log.push(entry);
    // Keep the file bounded (last 1000 entries)
    if (log.length > 1000) {
      log.splice(0, log.length - 1000);
    }
    this.writeJson(this.auditFile, log);
  }

  // ---- Config ----
  getConfig(): EnterpriseConfig {
    return this.readJson<EnterpriseConfig>(this.configFile, {
      enableAuditLogging: true,
      enableRemoteManagement: false,
      requireAdminForChanges: false,
      allowedBrands: [],
      maxMonitors: 16,
      profileSharingEnabled: true,
    });
  }

  saveConfig(config: EnterpriseConfig): EnterpriseConfig {
    this.writeJson(this.configFile, config);
    return config;
  }
}
