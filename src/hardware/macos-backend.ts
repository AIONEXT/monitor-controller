import { Monitor, MonitorSetting, MonitorCapabilities } from '../monitor-types';

export class MacOSMonitorBackend {
  async getMonitors(): Promise<Monitor[]> {
    return this.getFallbackMonitors();
  }

  async getSettings(_monitorId: string): Promise<MonitorSetting[]> {
    return [];
  }

  async setSetting(
    _monitorId: string,
    _settingId: string,
    _value: number
  ): Promise<MonitorSetting | null> {
    throw new Error('DDC/CI not supported on macOS. Use monitor OSD controls.');
  }

  async resetToDefaults(_monitorId: string): Promise<MonitorSetting[]> {
    return [];
  }

  async getCapabilities(_monitorId: string): Promise<MonitorCapabilities> {
    return {};
  }

  private getFallbackMonitors(): Monitor[] {
    return [
      {
        id: 'monitor-0',
        name: 'Built-in Display (macOS)',
        manufacturer: 'Apple',
        model: 'Built-in',
        serialNumber: 'BUILTIN',
        displayIndex: 0,
        isPrimary: true,
        capabilities: {},
        settings: [],
      },
    ];
  }
}