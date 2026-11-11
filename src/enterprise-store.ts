import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { MonitorProfile, MonitorSchedule, AuditLogEntry, EnterpriseConfig } from './monitor-types';

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

  private ensureDir(): void { fs.mkdirSync(this.dataDir, { recursive: true }); }

  private readJson<T>(file: string, fallback: T): T {
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
    } catch (error) {
      console.error(`Failed to read ${file}:`, error);
      return fallback;
    }
  }

  private writeJson(file: string, data: unknown): void {
    const temporaryFile = `${file}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(temporaryFile, file);
    } catch (error) {
      try { if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile); } catch { /* Best effort cleanup. */ }
      console.error(`Failed to write ${file}:`, error);
      throw error;
    }
  }

  getProfiles(): MonitorProfile[] { return this.readJson<MonitorProfile[]>(this.profilesFile, []); }

  saveProfile(profile: MonitorProfile): MonitorProfile {
    if (!profile || typeof profile.id !== 'string' || typeof profile.name !== 'string' || !profile.settings || typeof profile.settings !== 'object') throw new TypeError('Invalid monitor profile');
    const profiles = this.getProfiles();
    const idx = profiles.findIndex((item) => item.id === profile.id);
    const saved = { ...profile, updatedAt: Date.now() };
    if (idx >= 0) profiles[idx] = saved; else profiles.push(saved);
    this.writeJson(this.profilesFile, profiles);
    return saved;
  }

  deleteProfile(profileId: string): void { this.writeJson(this.profilesFile, this.getProfiles().filter((profile) => profile.id !== profileId)); }
  getSchedules(): MonitorSchedule[] { return this.readJson<MonitorSchedule[]>(this.schedulesFile, []); }

  saveSchedule(schedule: MonitorSchedule): MonitorSchedule {
    if (!schedule || typeof schedule.id !== 'string' || typeof schedule.name !== 'string') throw new TypeError('Invalid monitor schedule');
    const schedules = this.getSchedules();
    const idx = schedules.findIndex((item) => item.id === schedule.id);
    const saved = { ...schedule, createdAt: schedule.createdAt || Date.now() };
    if (idx >= 0) schedules[idx] = saved; else schedules.push(saved);
    this.writeJson(this.schedulesFile, schedules);
    return saved;
  }

  deleteSchedule(scheduleId: string): void { this.writeJson(this.schedulesFile, this.getSchedules().filter((schedule) => schedule.id !== scheduleId)); }

  getAuditLog(limit = 200): AuditLogEntry[] {
    const safeLimit = Number.isFinite(limit) ? Math.min(1000, Math.max(0, Math.floor(limit))) : 200;
    return this.readJson<AuditLogEntry[]>(this.auditFile, []).slice(-safeLimit);
  }

  appendAudit(entry: AuditLogEntry): void {
    if (!entry || typeof entry.monitorId !== 'string' || typeof entry.settingId !== 'string' || !Number.isFinite(entry.timestamp)) throw new TypeError('Invalid audit entry');
    const audit = this.readJson<AuditLogEntry[]>(this.auditFile, []);
    audit.push(entry);
    this.writeJson(this.auditFile, audit.slice(-1000));
  }

  getConfig(): EnterpriseConfig {
    const defaults: EnterpriseConfig = { enableAuditLogging: true, enableRemoteManagement: false, requireAdminForChanges: false, allowedBrands: [], maxMonitors: 16, profileSharingEnabled: true };
    const saved = this.readJson<Partial<EnterpriseConfig>>(this.configFile, {});
    return { ...defaults, ...saved, allowedBrands: Array.isArray(saved.allowedBrands) ? saved.allowedBrands.filter((brand): brand is string => typeof brand === 'string') : defaults.allowedBrands };
  }

  saveConfig(config: EnterpriseConfig): EnterpriseConfig {
    if (!config || typeof config !== 'object') throw new TypeError('Invalid enterprise config');
    const normalized: EnterpriseConfig = {
      enableAuditLogging: config.enableAuditLogging === true,
      enableRemoteManagement: config.enableRemoteManagement === true,
      requireAdminForChanges: config.requireAdminForChanges === true,
      allowedBrands: Array.isArray(config.allowedBrands) ? [...new Set(config.allowedBrands.filter((brand): brand is string => typeof brand === 'string'))] : [],
      maxMonitors: Number.isFinite(config.maxMonitors) ? Math.max(1, Math.min(128, Math.floor(config.maxMonitors))) : 16,
      profileSharingEnabled: config.profileSharingEnabled === true,
    };
    this.writeJson(this.configFile, normalized);
    return normalized;
  }
}
