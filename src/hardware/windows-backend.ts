import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Monitor, MonitorCapabilities, MonitorSetting } from '../monitor-types';
import { VCP_CODES } from '../monitor-types';

const execFileAsync = promisify(execFile);

interface WindowsDisplayInfo {
  InstanceName?: string;
  Manufacturer?: string;
  Model?: string;
  SerialNumber?: string;
  IsActive?: boolean;
  BrightnessSupported?: boolean;
  CurrentBrightness?: number;
  MaxBrightness?: number;
}

interface WindowsMonitorRecord {
  monitor: Monitor;
  instanceName: string;
}

function asMonitorArray(value: unknown): WindowsDisplayInfo[] {
  if (Array.isArray(value)) return value as WindowsDisplayInfo[];
  return value && typeof value === 'object' ? [value as WindowsDisplayInfo] : [];
}

export class WindowsMonitorBackend {
  private monitorById = new Map<string, WindowsMonitorRecord>();

  async getMonitors(): Promise<Monitor[]> {
    const script = `
      $ErrorActionPreference = 'Stop'
      $items = @(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorID | Where-Object { $_.Active })
      $brightness = @(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue)
      $methods = @(Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue)
      $result = foreach ($item in $items) {
        $decode = { param($v) if ($null -eq $v) { '' } else { [string]::Join('', @($v | Where-Object { $_ -ne 0 } | ForEach-Object { [char]$_ })).Trim() } }
        $instance = [string]$item.InstanceName
        $b = $brightness | Where-Object { $_.InstanceName -eq $instance } | Select-Object -First 1
        $m = $methods | Where-Object { $_.InstanceName -eq $instance } | Select-Object -First 1
        [pscustomobject]@{
          InstanceName = $instance
          Manufacturer = (& $decode $item.ManufacturerName)
          Model = (& $decode $item.UserFriendlyName)
          SerialNumber = (& $decode $item.SerialNumberID)
          IsActive = [bool]$item.Active
          BrightnessSupported = ($null -ne $b -and $null -ne $m)
          CurrentBrightness = if ($b) { [int]$b.CurrentBrightness } else { 0 }
          MaxBrightness = if ($b) { [int]$b.Levels - 1 } else { 100 }
        }
      }
      ConvertTo-Json -InputObject @($result) -Compress -Depth 3
    `;
    const { stdout } = await execFileAsync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { timeout: 15000, encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 });
    let parsed: unknown;
    try { parsed = JSON.parse(stdout.trim()); } catch { parsed = []; }
    const rows = asMonitorArray(parsed).filter((row) => row.InstanceName);
    this.monitorById.clear();
    return rows.map((row, index) => {
      const instanceName = row.InstanceName as string;
      // Preserve the actual WMI instance path. It contains separators which
      // cannot safely be reconstructed from a sanitized display ID.
      const id = `win-${index}-${instanceName.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const brightnessInfo = VCP_CODES.brightness;
      const supported = row.BrightnessSupported === true && Number.isFinite(row.CurrentBrightness);
      const max = Number.isFinite(row.MaxBrightness) && (row.MaxBrightness as number) > 0 ? row.MaxBrightness as number : 100;
      const capabilities: MonitorCapabilities = {
        brightness: { supported, min: 0, max, step: 1, vcpCode: brightnessInfo.code, type: brightnessInfo.type, category: brightnessInfo.category, description: brightnessInfo.description },
      };
      const settings: MonitorSetting[] = supported ? [{
        id: 'brightness', name: brightnessInfo.name, value: Math.max(0, Math.min(max, row.CurrentBrightness as number)),
        min: 0, max, step: 1, unit: brightnessInfo.unit, icon: brightnessInfo.icon, vcpCode: brightnessInfo.code,
        type: brightnessInfo.type, readable: true, writable: true, category: brightnessInfo.category, description: brightnessInfo.description,
      }] : [];
      const manufacturer = row.Manufacturer || 'Unknown';
      const model = row.Model || 'Unknown';
      const monitor: Monitor = {
        id, name: model === 'Unknown' ? `${manufacturer} Display` : model, manufacturer, model,
        serialNumber: row.SerialNumber || 'Unknown', displayIndex: index, isPrimary: index === 0,
        capabilities, settings, ddcSupported: supported,
      };
      this.monitorById.set(id, { monitor, instanceName });
      return monitor;
    });
  }

  async getSettings(monitorId: string): Promise<MonitorSetting[]> {
    const record = await this.getMonitor(monitorId);
    const setting = record?.monitor.settings.find((item) => item.id === 'brightness');
    if (!record || !setting) return [];
    const escapedInstance = record.instanceName.replace(/'/g, "''");
    const script = `
      $ErrorActionPreference = 'Stop'
      $instance = '${escapedInstance}'
      $display = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightness | Where-Object { $_.InstanceName -eq $instance } | Select-Object -First 1
      if ($display) { @{ current = [int]$display.CurrentBrightness; max = [int]($display.Levels - 1) } | ConvertTo-Json -Compress }
    `;
    try {
      const { stdout } = await execFileAsync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { timeout: 5000, encoding: 'utf8', windowsHide: true });
      const current = JSON.parse(stdout.trim()) as { current?: number; max?: number };
      return [{ ...setting, value: Number.isFinite(current.current) ? current.current as number : setting.value, max: Number.isFinite(current.max) && (current.max as number) > 0 ? current.max as number : setting.max }];
    } catch { return [{ ...setting }]; }
  }

  async setSetting(monitorId: string, settingId: string, value: number): Promise<MonitorSetting | null> {
    if (settingId !== 'brightness' || !Number.isFinite(value)) return null;
    const record = await this.getMonitor(monitorId);
    const setting = record?.monitor.settings.find((item) => item.id === settingId);
    if (!record || !setting || !setting.writable) return null;
    const clamped = Math.round(Math.max(setting.min, Math.min(setting.max, value)));
    const escapedInstance = record.instanceName.replace(/'/g, "''");
    const script = `
      $ErrorActionPreference = 'Stop'
      $instance = '${escapedInstance}'
      $methods = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightnessMethods | Where-Object { $_.InstanceName -eq $instance } | Select-Object -First 1
      if (-not $methods) { throw 'Brightness control is not available for this display' }
      $result = Invoke-CimMethod -InputObject $methods -MethodName WmiSetBrightness -Arguments @{ Timeout = [uint32]0; Brightness = [byte]${clamped} }
      if ($result.ReturnValue -ne 0) { throw "WmiSetBrightness failed with code $($result.ReturnValue)" }
    `;
    await execFileAsync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { timeout: 7000, windowsHide: true });
    setting.value = clamped;
    return { ...setting };
  }

  async resetToDefaults(monitorId: string): Promise<MonitorSetting[]> {
    const record = await this.getMonitor(monitorId);
    const brightness = record?.monitor.settings.find((setting) => setting.id === 'brightness');
    if (!brightness) return [];
    const value = Math.round((brightness.min + brightness.max) / 2);
    const result = await this.setSetting(monitorId, brightness.id, value);
    return result ? [result] : [];
  }

  async getCapabilities(monitorId: string): Promise<MonitorCapabilities> {
    const record = await this.getMonitor(monitorId);
    return record ? Object.fromEntries(Object.entries(record.monitor.capabilities).map(([id, capability]) => [id, { ...capability }])) : {};
  }

  private async getMonitor(monitorId: string): Promise<WindowsMonitorRecord | undefined> {
    let record = this.monitorById.get(monitorId);
    if (!record) {
      await this.getMonitors();
      record = this.monitorById.get(monitorId);
    }
    return record;
  }
}
