import { Monitor, MonitorSetting, MonitorCapabilities } from './monitor-types';
import { getMonitorBackend, resetBackend } from './hardware/factory';

export class MonitorManager {
  private backend = getMonitorBackend();
  private monitorCache: Monitor[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 30000;

  async getMonitors(forceRefresh = false): Promise<Monitor[]> {
    const now = Date.now();
    
    if (!forceRefresh && this.monitorCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.monitorCache;
    }

    try {
      this.monitorCache = await this.backend.getMonitors();
      this.cacheTimestamp = now;
      return this.monitorCache;
    } catch (error) {
      console.error('Failed to get monitors:', error);
      if (this.monitorCache) return this.monitorCache;
      throw error;
    }
  }

  async getSettings(monitorId: string): Promise<MonitorSetting[]> {
    try {
      return await this.backend.getSettings(monitorId);
    } catch (error) {
      console.error('Failed to get monitor settings:', error);
      throw error;
    }
  }

  async setSetting(monitorId: string, settingId: string, value: number): Promise<MonitorSetting | null> {
    try {
      const result = await this.backend.setSetting(monitorId, settingId, value);
      if (result) {
        this.invalidateCache();
      }
      return result;
    } catch (error) {
      console.error('Failed to set monitor setting:', error);
      throw error;
    }
  }

  async resetToDefaults(monitorId: string): Promise<MonitorSetting[]> {
    try {
      const result = await this.backend.resetToDefaults(monitorId);
      this.invalidateCache();
      return result;
    } catch (error) {
      console.error('Failed to reset monitor settings:', error);
      throw error;
    }
  }

  async getCapabilities(monitorId: string): Promise<MonitorCapabilities> {
    try {
      return await this.backend.getCapabilities(monitorId);
    } catch (error) {
      console.error('Failed to get monitor capabilities:', error);
      return {};
    }
  }

  refreshMonitors(): void {
    this.invalidateCache();
  }

  resetBackend(): void {
    resetBackend();
    this.backend = getMonitorBackend();
    this.invalidateCache();
  }

  private invalidateCache(): void {
    this.monitorCache = null;
    this.cacheTimestamp = 0;
  }
}