import { Monitor, MonitorSetting, MonitorCapabilities, VCP_CODES } from '../monitor-types';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface WMIMonitorInfo {
  DeviceID?: string;
  Manufacturer?: string;
  Name?: string;
  ScreenHeight?: number;
  ScreenWidth?: number;
  SerialNumberID?: string;
  PNPDeviceID?: string;
  Model?: string;
  SerialNumber?: string;
  IsPrimary?: boolean;
}

export class WindowsMonitorBackend {
  private useMockMode = false;
  private mockMonitors: Monitor[] | null = null;

  async getMonitors(): Promise<Monitor[]> {
    if (this.useMockMode) {
      return this.getMockMonitors();
    }

    try {
      const monitors = await this.enumerateMonitorsWMI();
      if (monitors.length === 0) {
        console.warn('No monitors detected via WMI, enabling mock mode');
        this.useMockMode = true;
        return this.getMockMonitors();
      }

      const monitorsWithCaps = await Promise.all(
        monitors.map(m => this.enhanceWithCapabilities(m))
      );
      return monitorsWithCaps;
    } catch (error) {
      console.error('Windows monitor enumeration failed, enabling mock mode:', error);
      this.useMockMode = true;
      return this.getMockMonitors();
    }
  }

  private async enumerateMonitorsWMI(): Promise<Monitor[]> {
    const psScript = `
$ErrorActionPreference = "SilentlyContinue"
$monitors = @()

# Try WMI MonitorID first
try {
  $wmiMonitors = Get-WmiObject -Namespace "root\\wmi" -Class WmiMonitorID -ErrorAction Stop
  if ($wmiMonitors) {
    $wmiMonitors | ForEach-Object {
      $manufacturerBytes = $_.ManufacturerName | Where-Object { $_ -ne 0 }
      $modelBytes = $_.UserFriendlyName | Where-Object { $_ -ne 0 }
      $serialBytes = $_.SerialNumberID | Where-Object { $_ -ne 0 }
      
      $manufacturer = [System.Text.Encoding]::ASCII.GetString($manufacturerBytes)
      $model = [System.Text.Encoding]::ASCII.GetString($modelBytes)
      $serial = [System.Text.Encoding]::ASCII.GetString($serialBytes)
      $instance = $_.InstanceName
      
      $desktopMonitor = Get-WmiObject -Class Win32_DesktopMonitor -ErrorAction SilentlyContinue | 
        Where-Object { $_.DeviceID -like "*$([regex]::Escape($instance.Split('\\')[0]))*" }
      
      $monitors += [PSCustomObject]@{
        DeviceID = $instance
        Manufacturer = $manufacturer.Trim()
        Model = $model.Trim()
        SerialNumber = $serial.Trim()
        ScreenWidth = if ($desktopMonitor) { $desktopMonitor.ScreenWidth } else { 0 }
        ScreenHeight = if ($desktopMonitor) { $desktopMonitor.ScreenHeight } else { 0 }
        IsPrimary = if ($desktopMonitor) { $desktopMonitor.Availability -eq 3 } else { $false }
      }
    }
  }
} catch { }

# Fallback: Win32_DesktopMonitor only
if ($monitors.Count -eq 0) {
  Get-WmiObject -Class Win32_DesktopMonitor -ErrorAction SilentlyContinue | ForEach-Object {
    $monitors += [PSCustomObject]@{
      DeviceID = $_.DeviceID
      Manufacturer = $_.MonitorManufacturer
      Model = $_.MonitorType
      SerialNumber = $_.SerialNumber
      ScreenWidth = $_.ScreenWidth
      ScreenHeight = $_.ScreenHeight
      IsPrimary = $_.Availability -eq 3
    }
  }
}

$monitors | ConvertTo-Json -Depth 3
`;

    try {
      const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', psScript], {
        timeout: 10000,
        encoding: 'utf8',
      });

      if (!stdout || stdout.trim() === '') {
        return [];
      }

      const monitors = JSON.parse(stdout);
      const monitorArray = Array.isArray(monitors) ? monitors : [monitors];

      return monitorArray
        .filter((m: WMIMonitorInfo) => m && (m.DeviceID || m.Model || m.Name))
        .map((m: WMIMonitorInfo, index: number) => this.createMonitorFromWMI(m, index));
    } catch (error) {
      console.error('WMI enumeration error:', error);
      return [];
    }
  }

  private createMonitorFromWMI(wmi: WMIMonitorInfo, index: number): Monitor {
    const widthMm = wmi.ScreenWidth || 0;
    const heightMm = wmi.ScreenHeight || 0;
    const diagonalInches = widthMm && heightMm 
      ? Math.sqrt(widthMm * widthMm + heightMm * heightMm) / 25.4 
      : undefined;

    return {
      id: `monitor-${wmi.DeviceID?.replace(/[^a-zA-Z0-9]/g, '-') || index}`,
      name: wmi.Model || wmi.Name || `Monitor ${index + 1}`,
      manufacturer: wmi.Manufacturer || 'Unknown',
      model: wmi.Model || 'Unknown',
      serialNumber: wmi.SerialNumber || `SN-${index}`,
      displayIndex: index,
      isPrimary: wmi.IsPrimary || index === 0,
      widthMm: widthMm || undefined,
      heightMm: heightMm || undefined,
      diagonalInches: diagonalInches ? Math.round(diagonalInches * 10) / 10 : undefined,
      capabilities: {},
      settings: [],
    };
  }

  private async enhanceWithCapabilities(monitor: Monitor): Promise<Monitor> {
    const capabilities = await this.probeVCPCapabilities(monitor);
    const settings = await this.createSettingsFromCapabilities(monitor, capabilities);
    
    return {
      ...monitor,
      capabilities,
      settings,
    };
  }

  private async probeVCPCapabilities(monitor: Monitor): Promise<MonitorCapabilities> {
    const capabilities: MonitorCapabilities = {};
    const displayIndex = monitor.displayIndex;

    // Test each VCP code
    for (const [settingId, vcpInfo] of Object.entries(VCP_CODES)) {
      try {
        const supported = await this.testVCPSupport(displayIndex, vcpInfo.code);
        if (supported) {
          const result = await this.getVCPFeature(displayIndex, vcpInfo.code);
          capabilities[settingId] = {
            supported: true,
            min: result?.min || vcpInfo.defaultMin,
            max: result?.max || vcpInfo.defaultMax,
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

  private async testVCPSupport(displayIndex: number, vcpCode: number): Promise<boolean> {
    // Only brightness (0x10) is reliably available via WMI
    if (vcpCode === 0x10) return true;
    
    // For other codes, we'd need a native DDC/CI implementation
    // Return false to indicate not supported via WMI
    return false;
  }

  private async getVCPFeature(displayIndex: number, vcpCode: number): Promise<{ current: number; max: number; min?: number } | null> {
    if (vcpCode !== 0x10) return null;

    const psScript = `
      try {
        $monitor = Get-WmiObject -Namespace "root\\wmi" -Class WmiMonitorBrightnessMethods -ErrorAction Stop
        if ($monitor -and $monitor[${displayIndex}]) {
          $result = $monitor[${displayIndex}].WmiGetBrightness()
          if ($result.ReturnValue -eq 0) {
            @{ Current = $result.CurrentBrightness; Max = $result.MaxBrightness; Min = 0 } | ConvertTo-Json
          }
        }
      } catch { }
    `;

    try {
      const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', psScript], {
        timeout: 5000,
        encoding: 'utf8',
      });
      
      const result = JSON.parse(stdout.trim());
      if (result && typeof result.Current === 'number') {
        return {
          current: result.Current,
          max: result.Max || 100,
          min: result.Min || 0,
        };
      }
    } catch {
      // Ignore
    }

    return null;
  }

  private async createSettingsFromCapabilities(monitor: Monitor, capabilities: MonitorCapabilities): Promise<MonitorSetting[]> {
    const settings: MonitorSetting[] = [];

    for (const [settingId, cap] of Object.entries(capabilities)) {
      const vcpInfo = VCP_CODES[settingId];
      if (!vcpInfo || !cap.supported) continue;

      let currentValue = vcpInfo.defaultMin + (vcpInfo.defaultMax - vcpInfo.defaultMin) / 2;
      
      // Try to get actual current value for supported features
      if (cap.supported && cap.vcpCode === 0x10) {
        const result = await this.getVCPFeature(monitor.displayIndex, cap.vcpCode);
        if (result) currentValue = result.current;
      }

      settings.push({
        id: settingId,
        name: vcpInfo.name,
        value: Math.round(currentValue),
        min: cap.min,
        max: cap.max,
        step: cap.step,
        unit: vcpInfo.unit,
        icon: vcpInfo.icon,
        vcpCode: cap.vcpCode,
        type: cap.type,
        readable: cap.supported,
        writable: cap.supported,
      });
    }

    // If no real settings, provide mock ones for UI demonstration
    if (settings.length === 0) {
      return this.getMockSettings(monitor);
    }

    return settings;
  }

  async getSettings(monitorId: string): Promise<MonitorSetting[]> {
    if (this.useMockMode) {
      const mockMonitors = this.getMockMonitors();
      const monitor = mockMonitors.find(m => m.id === monitorId);
      return monitor?.settings || [];
    }

    const monitors = await this.getMonitors();
    const monitor = monitors.find(m => m.id === monitorId);
    return monitor?.settings || [];
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
    
    try {
      await this.setVCPFeature(monitor.displayIndex, setting.vcpCode, clampedValue);
      setting.value = clampedValue;
      return { ...setting };
    } catch (error) {
      console.error(`Failed to set ${settingId}:`, error);
      // Fall back to mock mode on failure
      this.useMockMode = true;
      return this.setMockSetting(monitorId, settingId, value);
    }
  }

  private async setVCPFeature(displayIndex: number, vcpCode: number, value: number): Promise<void> {
    if (vcpCode === 0x10) {
      const psScript = `
        $monitor = Get-WmiObject -Namespace "root\\wmi" -Class WmiMonitorBrightnessMethods
        if ($monitor -and $monitor[${displayIndex}]) {
          $monitor[${displayIndex}].WmiSetBrightness(${value}, 0)
        }
      `;
      await execFileAsync('powershell', ['-NoProfile', '-Command', psScript], { timeout: 5000 });
      return;
    }

    throw new Error(`VCP code 0x${vcpCode.toString(16)} not implemented for Windows`);
  }

  async resetToDefaults(monitorId: string): Promise<MonitorSetting[]> {
    if (this.useMockMode) {
      return this.resetMockToDefaults(monitorId);
    }

    const monitors = await this.getMonitors();
    const monitor = monitors.find(m => m.id === monitorId);
    if (!monitor) return [];

    const resetSettings: MonitorSetting[] = [];
    
    for (const setting of monitor.settings) {
      if (setting.writable && setting.vcpCode) {
        try {
          const defaultValue = Math.round((setting.min + setting.max) / 2);
          await this.setVCPFeature(monitor.displayIndex, setting.vcpCode, defaultValue);
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

  // Mock mode for demonstration when hardware access fails
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
        settings: this.getMockSettings({ id: 'monitor-0', displayIndex: 0 } as Monitor),
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
        settings: this.getMockSettings({ id: 'monitor-1', displayIndex: 1 } as Monitor),
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

  private getMockSettings(monitor: Monitor): MonitorSetting[] {
    const baseValues: Record<string, number> = {
      brightness: monitor.isPrimary ? 75 : 60,
      contrast: monitor.isPrimary ? 70 : 75,
      sharpness: 50,
      colorTemp: 6500,
      gamma: 22,
      hue: 50,
      saturation: monitor.isPrimary ? 50 : 55,
      blueLight: monitor.isPrimary ? 0 : 30,
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

  // Public method to force refresh
  refresh(): void {
    this.useMockMode = false;
    this.mockMonitors = null;
  }
}