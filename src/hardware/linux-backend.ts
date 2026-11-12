import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Monitor, MonitorCapabilities, MonitorSetting } from '../monitor-types';
import { VCP_CODES } from '../monitor-types';

const execFileAsync = promisify(execFile);

interface DdcDetectedDisplay {
  display?: number;
  bus_number?: number;
  i2c_bus?: string;
  model?: string;
  manufacturer?: string;
  mfg_id?: string;
  serial?: string;
  width_mm?: number;
  height_mm?: number;
}

interface DdcVcpValue {
  code?: number | string;
  current?: number | string;
  current_value?: number | string;
  max?: number | string;
  maximum?: number | string;
  max_value?: number | string;
}

function parseJson(stdout: string): unknown {
  try { return JSON.parse(stdout); } catch { return undefined; }
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function displayList(value: unknown): DdcDetectedDisplay[] {
  if (Array.isArray(value)) return value as DdcDetectedDisplay[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const candidate of [record.displays, record.display, record.detected_displays]) {
      if (Array.isArray(candidate)) return candidate as DdcDetectedDisplay[];
    }
  }
  return [];
}

function vcpList(value: unknown): DdcVcpValue[] {
  if (Array.isArray(value)) return value as DdcVcpValue[];
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const candidate of [record.vcp, record.values, record.features, record.result]) {
      if (Array.isArray(candidate)) return candidate as DdcVcpValue[];
    }
    if ('current' in record || 'current_value' in record) return [record as DdcVcpValue];
  }
  return [];
}

function validPhysicalSize(value: unknown): number | undefined {
  const size = asNumber(value);
  return size !== undefined && size > 0 && size < 3000 ? size : undefined;
}

export class LinuxMonitorBackend {
  private monitorById = new Map<string, { display: number; monitor: Monitor }>();
  private monitorCache: Monitor[] | null = null;

  async getMonitors(): Promise<Monitor[]> {
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync('ddcutil', ['detect', '--brief', '--json'], { timeout: 15000, encoding: 'utf8' }));
    } catch (error) {
      // Missing ddcutil, I2C permission problems, and no-adapter systems must
      // result in a usable empty state rather than taking down renderer boot.
      this.monitorById.clear();
      this.monitorCache = [];
      console.warn('Linux display discovery unavailable. Install/configure ddcutil and verify I2C permissions.', error);
      return [];
    }

    const detected = displayList(parseJson(stdout));
    const monitors: Monitor[] = [];
    this.monitorById.clear();

    for (const [index, item] of detected.entries()) {
      const display = asNumber(item.display) ?? index + 1;
      if (!Number.isInteger(display) || display < 1) continue;
      const provisional = this.createMonitor(item, index, display);
      const { capabilities, settings } = await this.probeMonitor(display);
      const monitor: Monitor = { ...provisional, capabilities, settings, ddcSupported: Object.values(capabilities).some((capability) => capability.supported) };
      monitors.push(monitor);
      this.monitorById.set(monitor.id, { display, monitor });
    }
    this.monitorCache = monitors;
    return monitors;
  }

  private createMonitor(item: DdcDetectedDisplay, index: number, display: number): Monitor {
    const widthMm = validPhysicalSize(item.width_mm);
    const heightMm = validPhysicalSize(item.height_mm);
    const manufacturer = item.manufacturer || item.mfg_id || 'Unknown';
    const model = item.model || 'Unknown';
    const id = `ddc-${display}-${String(item.serial || model).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    const diagonal = widthMm && heightMm ? Math.sqrt(widthMm ** 2 + heightMm ** 2) / 25.4 : undefined;
    return {
      id, name: model === 'Unknown' ? `Monitor ${display}` : model, manufacturer, model,
      serialNumber: item.serial || 'Unknown', displayIndex: index, isPrimary: index === 0,
      widthMm, heightMm, diagonalInches: diagonal ? Math.round(diagonal * 10) / 10 : undefined,
      capabilities: {}, settings: [], ddcSupported: true,
    };
  }

  private async probeMonitor(display: number): Promise<{ capabilities: MonitorCapabilities; settings: MonitorSetting[] }> {
    const capabilities: MonitorCapabilities = {};
    const settings: MonitorSetting[] = [];
    for (const [id, info] of Object.entries(VCP_CODES)) {
      try {
        const result = await this.readVcp(display, info.code, 5000);
        if (!result) {
          capabilities[id] = { supported: false, min: info.defaultMin, max: info.defaultMax, step: info.defaultStep, vcpCode: info.code, type: info.type, category: info.category, description: info.description };
          continue;
        }
        const max = asNumber(result.max ?? result.maximum ?? result.max_value) ?? info.defaultMax;
        const min = info.defaultMin;
        const current = asNumber(result.current ?? result.current_value);
        if (max < min) continue;
        capabilities[id] = { supported: true, min, max, step: info.defaultStep, vcpCode: info.code, type: info.type, category: info.category, description: info.description };
        settings.push({
          id, name: info.name, value: current === undefined ? min + Math.round((max - min) / 2) : Math.max(min, Math.min(max, current)),
          min, max, step: info.defaultStep, unit: info.unit, icon: info.icon, vcpCode: info.code,
          type: info.type, readable: current !== undefined, writable: true, category: info.category, description: info.description,
        });
      } catch {
        capabilities[id] = { supported: false, min: info.defaultMin, max: info.defaultMax, step: info.defaultStep, vcpCode: info.code, type: info.type, category: info.category, description: info.description };
      }
    }
    return { capabilities, settings };
  }

  private async readVcp(display: number, code: number, timeout: number): Promise<DdcVcpValue | undefined> {
    const { stdout } = await execFileAsync('ddcutil', ['getvcp', code.toString(16).toUpperCase(), '--display', String(display), '--brief', '--json'], { timeout, encoding: 'utf8' });
    return vcpList(parseJson(stdout)).find((item) => {
      const reportedCode = asNumber(item.code);
      return reportedCode === undefined || reportedCode === code;
    });
  }

  async getSettings(monitorId: string): Promise<MonitorSetting[]> {
    const record = await this.findMonitor(monitorId);
    if (!record) return [];
    return Promise.all(record.monitor.settings.map(async (setting) => {
      if (!setting.vcpCode || !setting.readable) return { ...setting };
      try {
        const value = await this.readVcp(record.display, setting.vcpCode, 4000);
        const current = asNumber(value?.current ?? value?.current_value);
        return current === undefined ? { ...setting } : { ...setting, value: Math.max(setting.min, Math.min(setting.max, current)) };
      } catch { return { ...setting }; }
    }));
  }

  async setSetting(monitorId: string, settingId: string, value: number): Promise<MonitorSetting | null> {
    const record = await this.findMonitor(monitorId);
    const setting = record?.monitor.settings.find((item) => item.id === settingId);
    if (!record || !setting || !setting.writable || !setting.vcpCode || !Number.isFinite(value)) return null;
    const clamped = Math.round(Math.max(setting.min, Math.min(setting.max, value)));
    await execFileAsync('ddcutil', ['setvcp', setting.vcpCode.toString(16).toUpperCase(), String(clamped), '--display', String(record.display)], { timeout: 7000 });
    setting.value = clamped;
    return { ...setting };
  }

  async resetToDefaults(monitorId: string): Promise<MonitorSetting[]> {
    const record = await this.findMonitor(monitorId);
    if (!record) return [];
    const reset: MonitorSetting[] = [];
    for (const setting of record.monitor.settings) {
      if (!setting.writable || !setting.vcpCode) continue;
      const value = Math.round((setting.min + setting.max) / 2);
      try {
        await execFileAsync('ddcutil', ['setvcp', setting.vcpCode.toString(16).toUpperCase(), String(value), '--display', String(record.display)], { timeout: 7000 });
        setting.value = value;
        reset.push({ ...setting });
      } catch { /* Continue restoring other supported controls. */ }
    }
    return reset;
  }

  async getCapabilities(monitorId: string): Promise<MonitorCapabilities> {
    const record = await this.findMonitor(monitorId);
    return record ? Object.fromEntries(Object.entries(record.monitor.capabilities).map(([id, capability]) => [id, { ...capability }])) : {};
  }

  private async findMonitor(monitorId: string): Promise<{ display: number; monitor: Monitor } | undefined> {
    let record = this.monitorById.get(monitorId);
    if (!record) {
      await this.getMonitors();
      record = this.monitorById.get(monitorId);
    }
    return record;
  }

  refresh(): void { this.monitorById.clear(); this.monitorCache = null; }
}
