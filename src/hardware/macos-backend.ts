import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Monitor, MonitorCapabilities, MonitorSetting } from '../monitor-types';

const execFileAsync = promisify(execFile);

function collectDisplayRecords(value: unknown, records: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectDisplayRecords(item, records));
    return records;
  }
  if (!value || typeof value !== 'object') return records;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => key.startsWith('spdisplays_')) && (record._name || record['spdisplays_display-type'])) records.push(record);
  Object.values(record).forEach((item) => collectDisplayRecords(item, records));
  return records;
}

export class MacOSMonitorBackend {
  async getMonitors(): Promise<Monitor[]> {
    try {
      const { stdout } = await execFileAsync('/usr/sbin/system_profiler', ['SPDisplaysDataType', '-json'], { timeout: 15000, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
      const parsed: unknown = JSON.parse(stdout);
      const displays = collectDisplayRecords(parsed);
      return displays.map((display, index) => {
        const manufacturer = String(display['spdisplays_vendor'] ?? display['spdisplays_maker'] ?? 'Unknown');
        const model = String(display['_name'] ?? display['spdisplays_display-name'] ?? `Display ${index + 1}`);
        const serialNumber = String(display['spdisplays_serial-number'] ?? 'Unknown');
        return {
          id: `mac-display-${index}-${model.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: model, manufacturer, model, serialNumber, displayIndex: index, isPrimary: index === 0,
          capabilities: {}, settings: [], ddcSupported: false,
        };
      });
    } catch (error) {
      console.warn('macOS display discovery failed:', error);
      return [];
    }
  }

  async getSettings(_monitorId: string): Promise<MonitorSetting[]> { return []; }
  async setSetting(_monitorId: string, _settingId: string, _value: number): Promise<MonitorSetting | null> {
    throw new Error('DDC/CI controls are not available through this macOS backend.');
  }
  async resetToDefaults(_monitorId: string): Promise<MonitorSetting[]> { return []; }
  async getCapabilities(_monitorId: string): Promise<MonitorCapabilities> { return {}; }
}
