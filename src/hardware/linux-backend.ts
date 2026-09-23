import { Monitor, MonitorSetting, MonitorCapabilities, VCP_CODES } from '../monitor-types';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class LinuxMonitorBackend {
  private ddcutilAvailable: boolean | null = null;
  private useMockMode = false;
  private mockMonitors: Monitor[] | null = null;

  async getMonitors(): Promise<Monitor[]> {
    if (this.useMockMode) {
      return this.getMockMonitors();
    }

    if (!(await this.isDDCUtilAvailable())) {
      console.warn('ddcutil not available, enabling mock mode');
      this.useMockMode = true;
      return this.getMockMonitors();
    }

    try {
      const monitors = await this.enumerateMonitors();
      if (monitors.length === 0) {
        console.warn('No monitors detected via ddcutil, enabling mock mode');
        this.useMockMode = true;
        return this.getMockMonitors();
      }
      return monitors;
    } catch (error) {
      console.error('Linux monitor enumeration failed, enabling mock mode:', error);
      this.useMockMode = true;
      return this.getMockMonitors();
    }
  }

  private async isDDCUtilAvailable(): Promise<boolean> {
    if (this.ddcutilAvailable !== null) return this.ddcutilAvailable;

    try {
      await execFileAsync('ddcutil', ['--version'], { timeout: 3000 });
      this.ddcutilAvailable = true;
    } catch {
      this.ddcutilAvailable = false;
    }
    return this.ddcutilAvailable;
  }

  private async enumerateMonitors(): Promise<Monitor[]> {
    const { stdout } = await execFileAsync('ddcutil', ['detect', '--brief', '--json'], {
      timeout: 10000,
      encoding: 'utf8',
    });

    const detected = JSON.parse(stdout);
    const monitors: Monitor[] = [];

    for (const [index, det] of detected.entries()) {
      const displayNum = det.display || index + 1;
      const caps = await this.probeCapabilities(displayNum);
      const settings = this.createSettingsFromCapabilities(displayNum, caps);

      monitors.push({
        id: `monitor-${displayNum}`,
        name: det.model || `Monitor ${displayNum}`,
        manufacturer: det.manufacturer || 'Unknown',
        model: det.model || 'Unknown',
        serialNumber: det.serial || `SN-${displayNum}`,
        displayIndex: displayNum - 1,
        isPrimary: index === 0,
        widthMm: det.width_mm,
        heightMm: det.height_mm,
        diagonalInches: det.width_mm && det.height_mm
          ? Math.round(Math.sqrt(det.width_mm ** 2 + det.height_mm ** 2) / 25.4 * 10) / 10
          : undefined,
        capabilities: caps,
        settings,
      });
    }

    return monitors.length > 0 ? monitors : this.getMockMonitors();
  }

  private async probeCapabilities(displayNum: number): Promise<MonitorCapabilities> {
    const capabilities: MonitorCapabilities = {};

    for (const [settingId, vcpInfo] of Object.entries(VCP_CODES)) {
      try {
        const { stdout } = await execFileAsync('ddcutil', [
          'getvcp', vcpInfo.code.toString(16).toUpperCase(),
          '--display', displayNum.toString(),
          '--brief', '--json'
        ], { timeout: 5000, encoding: 'utf8' });

        const result = JSON.parse(stdout);
        if (result && result[0]) {
          const vcp = result[0];
          capabilities[settingId] = {
            supported: true,
            min: vcp.min || vcpInfo.defaultMin,
            max: vcp.max || vcpInfo.defaultMax,
            step: vcpInfo.defaultStep,
            vcpCode: vcpInfo.code,
            type: vcpInfo.type,
          };
        } else {
          capabilities[settingId] = this.getUnsupportedCapability(vcpInfo);
        }
      } catch {
        capabilities[settingId] = this.getUnsupportedCapability(vcpInfo);
      }
    }

    return capabilities;
  }

  private getUnsupportedCapability(vcpInfo: typeof VCP_CODES[string]): MonitorCapabilities[string] {
    return {
      supported: false,
      min: vcpInfo.defaultMin,
      max: vcpInfo.defaultMax,
      step: vcpInfo.defaultStep,
      vcpCode: vcpInfo.code,
      type: vcpInfo.type,
    };
  }

  private createSettingsFromCapabilities(displayNum: number, capabilities: MonitorCapabilities): MonitorSetting[] {
    const settings: MonitorSetting[] = [];

    for (const [settingId, cap] of Object.entries(capabilities)) {
      const vcpInfo = VCP_CODES[settingId];
      if (!vcpInfo || !cap.supported) continue;

      settings.push({
        id: settingId,
        name: vcpInfo.name,
        value: Math.round((cap.min + cap.max) / 2),
        min: cap.min,
        max: cap.max,
        step: cap.step,
        unit: vcpInfo.unit,
        icon: vcpInfo.icon,
        vcpCode: cap.vcpCode,
        type: cap.type,
        readable: true,
        writable: true,
      });
    }

    return settings.length > 0 ? settings : this.getMockSettings(displayNum);
  }

  async getSettings(monitorId: string): Promise<MonitorSetting[]> {
    if (this.useMockMode) {
      const mockMonitors = this.getMockMonitors();
      const monitor = mockMonitors.find(m => m.id === monitorId);
      return monitor?.settings || [];
    }

    const monitors = await this.getMonitors();
    const monitor = monitors.find(m => m.id === monitorId);
    if (!monitor) return [];

    const updatedSettings = await Promise.all(
      monitor.settings.map(async (setting) => {
        if (!setting.vcpCode) return setting;
        try {
          const value = await this.getVCPValue(monitor.displayIndex + 1, setting.vcpCode);
          return { ...setting, value };
        } catch {
          return setting;
        }
      })
    );

    return updatedSettings;
  }

  private async getVCPValue(displayNum: number, vcpCode: number): Promise<number> {
    const { stdout } = await execFileAsync('ddcutil', [
      'getvcp', vcpCode.toString(16).toUpperCase(),
      '--display', displayNum.toString(),
      '--brief', '--json'
    ], { timeout: 3000, encoding: 'utf8' });

    const result = JSON.parse(stdout);
    return result?.[0]?.current ?? 0;
  }

  async setSetting(monitorId: string, settingId: string, value: number): Promise<MonitorSetting | null> {
    if (this.useMockMode) {
      return this.setMockSetting(monitorId, settingId, value);
    }

    const monitors = await this.getMonitors();
    const monitor = monitors.find(m => m.id === monitorId);
    if (!monitor) return null;

    const setting = monitor.settings.find(s => s.id === settingId);
    if (!setting || !setting.vcpCode) return null;

    const clampedValue = Math.max(setting.min, Math.min(setting.max, value));
    const displayNum = monitor.displayIndex + 1;

    try {
      await execFileAsync('ddcutil', [
        'setvcp', setting.vcpCode.toString(16).toUpperCase(),
        clampedValue.toString(),
        '--display', displayNum.toString()
      ], { timeout: 5000 });

      setting.value = clampedValue;
      return { ...setting };
    } catch (error) {
      console.error(`Failed to set ${settingId}:`, error);
      this.useMockMode = true;
      return this.setMockSetting(monitorId, settingId, value);
    }
  }

  async resetToDefaults(monitorId: string): Promise<MonitorSetting[]> {
    if (this.useMockMode) {
      return this.resetMockToDefaults(monitorId);
    }

    const monitors = await this.getMonitors();
    const monitor = monitors.find(m => m.id === monitorId);
    if (!monitor) return [];

    const resetSettings: MonitorSetting[] = [];
    const displayNum = monitor.displayIndex + 1;

    for (const setting of monitor.settings) {
      if (setting.writable && setting.vcpCode) {
        try {
          const defaultValue = Math.round((setting.min + setting.max) / 2);
          await execFileAsync('ddcutil', [
            'setvcp', setting.vcpCode.toString(16).toUpperCase(),
            defaultValue.toString(),
            '--display', displayNum.toString()
          ], { timeout: 5000 });
          
          setting.value = defaultValue;
          resetSettings.push({ ...setting });
        } catch {
          // Continue with other settings
        }
      }
    }

    return resetSettings;
  }

  async getCapabilities(monitorId: string): Promise<MonitorCapabilities> {
    if (this.useMockMode) {
      const mockMonitors = this.getMockMonitors();
      const monitor = mockMonitors.find(m => m.id === monitorId);
      return monitor?.capabilities || {};
    }

    const monitors = await this.getMonitors();
    const monitor = monitors.find(m => m.id === monitorId);
    return monitor?.capabilities || {};
  }

  private getMockMonitors(): Monitor[] {
    if (this.mockMonitors) return this.mockMonitors;

    this.mockMonitors = [
      {
        id: 'monitor-0',
        name: 'LG UltraGear 27" (Demo)',
        manufacturer: 'LG',
        model: '27GP95R',
        serialNumber: 'LG27GP95R001',
        displayIndex: 0,
        isPrimary: true,
        widthMm: 597,
        heightMm: 336,
        diagonalInches: 27,
        capabilities: this.getMockCapabilities(),
        settings: this.getMockSettings(0),
      },
      {
        id: 'monitor-1',
        name: 'Dell UltraSharp 32" (Demo)',
        manufacturer: 'Dell',
        model: 'U3223QE',
        serialNumber: 'DELLU3223QE002',
        displayIndex: 1,
        isPrimary: false,
        widthMm: 698,
        heightMm: 393,
        diagonalInches: 31.5,
        capabilities: this.getMockCapabilities(),
        settings: this.getMockSettings(1),
      },
    ];

    return this.mockMonitors;
  }

  private getMockCapabilities(): MonitorCapabilities {
    const caps: MonitorCapabilities = {};
    for (const [settingId, vcpInfo] of Object.entries(VCP_CODES)) {
      caps[settingId] = {
        supported: true,
        min: vcpInfo.defaultMin,
        max: vcpInfo.defaultMax,
        step: vcpInfo.defaultStep,
        vcpCode: vcpInfo.code,
        type: vcpInfo.type,
      };
    }
    return caps;
  }

  private getMockSettings(displayIndex: number): MonitorSetting[] {
    const baseValues: Record<string, number> = {
      brightness: displayIndex === 0 ? 75 : 60,
      contrast: displayIndex === 0 ? 70 : 75,
      sharpness: 50,
      colorTemp: 6500,
      gamma: 22,
      hue: 50,
      saturation: displayIndex === 0 ? 50 : 55,
      blueLight: displayIndex === 0 ? 0 : 30,
      autoBrightness: 0,
      powerMode: 0,
      inputSource: 0x11,
    };

    return Object.entries(VCP_CODES).map(([settingId, vcpInfo]) => ({
      id: settingId,
      name: vcpInfo.name,
      value: baseValues[settingId] || Math.round((vcpInfo.defaultMin + vcpInfo.defaultMax) / 2),
      min: vcpInfo.defaultMin,
      max: vcpInfo.defaultMax,
      step: vcpInfo.defaultStep,
      unit: vcpInfo.unit,
      icon: vcpInfo.icon,
      vcpCode: vcpInfo.code,
      type: vcpInfo.type,
      readable: true,
      writable: true,
    }));
  }

  private async setMockSetting(monitorId: string, settingId: string, value: number): Promise<MonitorSetting | null> {
    const mockMonitors = this.getMockMonitors();
    const monitor = mockMonitors.find(m => m.id === monitorId);
    if (!monitor) return null;

    const setting = monitor.settings.find(s => s.id === settingId);
    if (!setting) return null;

    const clampedValue = Math.max(setting.min, Math.min(setting.max, value));
    setting.value = clampedValue;
    return { ...setting };
  }

  private async resetMockToDefaults(monitorId: string): Promise<MonitorSetting[]> {
    const mockMonitors = this.getMockMonitors();
    const monitor = mockMonitors.find(m => m.id === monitorId);
    if (!monitor) return [];

    const resetSettings: MonitorSetting[] = [];
    
    for (const setting of monitor.settings) {
      const defaultValue = Math.round((setting.min + setting.max) / 2);
      setting.value = defaultValue;
      resetSettings.push({ ...setting });
    }

    return resetSettings;
  }

  refresh(): void {
    this.ddcutilAvailable = null;
    this.useMockMode = false;
    this.mockMonitors = null;
  }
}