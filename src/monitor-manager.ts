import { Monitor, MonitorSetting, MonitorCapabilities } from './monitor-types';
import { getMonitorBackend, resetBackend } from './hardware/factory';
import { withBrandMetadata } from './hardware/brand-registry';
import { normalizeMonitorVcp, resolveCanonicalVcpId } from './hardware/vcp-normalizer';

export class MonitorManager {
  private backend = getMonitorBackend();
  private monitorCache: Monitor[] | null = null;
  private cacheTimestamp = 0;
  private monitorRequest: Promise<Monitor[]> | null = null;
  private readonly CACHE_TTL = 30000;

  async getMonitors(forceRefresh = false): Promise<Monitor[]> {
    const now = Date.now();
    if (!forceRefresh && this.monitorCache && now - this.cacheTimestamp < this.CACHE_TTL) return this.cloneMonitors(this.monitorCache);
    if (this.monitorRequest) return this.cloneMonitors(await this.monitorRequest);
    const request = this.backend.getMonitors().then((monitors) => monitors.map(normalizeMonitorVcp).map(withBrandMetadata));
    this.monitorRequest = request;
    try {
      const monitors = await request;
      this.monitorCache = monitors;
      this.cacheTimestamp = Date.now();
      return this.cloneMonitors(monitors);
    } catch (error) {
      console.error('Failed to get monitors:', error);
      if (this.monitorCache) return this.cloneMonitors(this.monitorCache);
      throw error;
    } finally { if (this.monitorRequest === request) this.monitorRequest = null; }
  }

  async getSettings(monitorId: string): Promise<MonitorSetting[]> {
    try { return (await this.backend.getSettings(monitorId)).map((setting) => ({ ...setting, id: resolveCanonicalVcpId(setting.id, setting.vcpCode) })); }
    catch (error) { console.error('Failed to get monitor settings:', error); throw error; }
  }

  async setSetting(monitorId: string, settingId: string, value: number): Promise<MonitorSetting | null> {
    try {
      if (!Number.isFinite(value)) throw new TypeError('Monitor setting value must be finite');
      const result = await this.backend.setSetting(monitorId, resolveCanonicalVcpId(settingId), value);
      if (result) this.invalidateCache();
      return result ? { ...result, id: resolveCanonicalVcpId(result.id, result.vcpCode) } : null;
    } catch (error) { console.error('Failed to set monitor setting:', error); throw error; }
  }

  async resetToDefaults(monitorId: string): Promise<MonitorSetting[]> {
    try {
      const result = await this.backend.resetToDefaults(monitorId);
      this.invalidateCache();
      return result.map((setting) => ({ ...setting }));
    } catch (error) { console.error('Failed to reset monitor settings:', error); throw error; }
  }

  async getCapabilities(monitorId: string): Promise<MonitorCapabilities> {
    try {
      const capabilities = await this.backend.getCapabilities(monitorId);
      return Object.fromEntries(Object.entries(capabilities).map(([id, capability]) => [resolveCanonicalVcpId(id, capability.vcpCode), { ...capability }]));
    } catch (error) { console.error('Failed to get monitor capabilities:', error); return {}; }
  }

  refreshMonitors(): void { this.invalidateCache(); }
  resetBackend(): void { resetBackend(); this.backend = getMonitorBackend(); this.invalidateCache(); }

  private cloneMonitors(monitors: Monitor[]): Monitor[] {
    return monitors.map((monitor) => ({
      ...monitor,
      capabilities: Object.fromEntries(Object.entries(monitor.capabilities).map(([id, capability]) => [id, { ...capability }])),
      settings: monitor.settings.map((setting) => ({ ...setting })),
    }));
  }

  private invalidateCache(): void { this.monitorCache = null; this.cacheTimestamp = 0; }
}
