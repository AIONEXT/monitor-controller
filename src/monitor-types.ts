export interface MonitorSetting {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: string;
  vcpCode?: number;
  type: 'continuous' | 'discrete';
  readable: boolean;
  writable: boolean;
  category?: 'display' | 'color' | 'comfort' | 'advanced' | 'power' | 'input' | 'audio' | 'picture';
  description?: string;
  presetValue?: number;
}

export interface MonitorCapabilities {
  [settingId: string]: {
    supported: boolean;
    min: number;
    max: number;
    step: number;
    vcpCode: number;
    type: 'continuous' | 'discrete';
    category?: string;
    description?: string;
  };
}

export interface Monitor {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  displayIndex: number;
  isPrimary: boolean;
  widthMm?: number;
  heightMm?: number;
  diagonalInches?: number;
  capabilities: MonitorCapabilities;
  settings: MonitorSetting[];
  brand?: string;
  connectionType?: 'HDMI' | 'DisplayPort' | 'USB-C' | 'DVI' | 'VGA' | 'Unknown';
  ddcSupported?: boolean;
  edidData?: string;
  firmwareVersion?: string;
}

export interface VCPCodeMap {
  [key: string]: {
    code: number;
    name: string;
    type: 'continuous' | 'discrete';
    defaultMin: number;
    defaultMax: number;
    defaultStep: number;
    unit: string;
    icon: string;
    category?: 'display' | 'color' | 'comfort' | 'advanced' | 'power' | 'input' | 'audio' | 'picture';
    description?: string;
    brandCompatibility?: string[];
  };
}

export interface MonitorProfile {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  settings: Record<string, Record<string, number>>;
  isDefault: boolean;
  isShared: boolean;
}

export interface MonitorSchedule {
  id: string;
  name: string;
  enabled: boolean;
  cronExpression: string;
  settings: Record<string, Record<string, number>>;
  monitorIds: string[];
  createdAt: number;
  lastRun?: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  monitorId: string;
  settingId: string;
  oldValue: number;
  newValue: number;
  userId?: string;
  action: 'set' | 'reset' | 'profile_apply' | 'schedule_apply';
}

export interface EnterpriseConfig {
  enableAuditLogging: boolean;
  enableRemoteManagement: boolean;
  requireAdminForChanges: boolean;
  allowedBrands: string[];
  maxMonitors: number;
  profileSharingEnabled: boolean;
}

export const VCP_CODES: VCPCodeMap = {
  brightness: { code: 0x10, name: 'Brightness', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'sun', category: 'display', description: 'Backlight intensity level' },
  contrast: { code: 0x12, name: 'Contrast', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'contrast', category: 'display', description: 'Difference between light and dark areas' },
  sharpness: { code: 0x8D, name: 'Sharpness', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'focus', category: 'display', description: 'Edge enhancement level' },
  blackLevel: { code: 0x1D, name: 'Black Level', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'circle', category: 'display', description: 'Darkest black reproduction' },
  whiteLevel: { code: 0x1E, name: 'White Level', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'sun', category: 'display', description: 'Brightest white reproduction' },
  colorTemp: { code: 0x14, name: 'Color Temperature', type: 'discrete', defaultMin: 4000, defaultMax: 9300, defaultStep: 100, unit: 'K', icon: 'thermometer', category: 'color', description: 'White point color temperature' },
  gamma: { code: 0x72, name: 'Gamma', type: 'discrete', defaultMin: 18, defaultMax: 26, defaultStep: 1, unit: '', icon: 'chart', category: 'color', description: 'Mid-tone brightness curve' },
  hue: { code: 0x16, name: 'Hue', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'palette', category: 'color', description: 'Color hue shift' },
  saturation: { code: 0x18, name: 'Saturation', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'droplet', category: 'color', description: 'Color intensity' },
  blueLight: { code: 0xE0, name: 'Blue Light Filter', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'shield', category: 'comfort', description: 'Low blue light mode for eye comfort' },
  autoBrightness: { code: 0xD0, name: 'Auto Brightness', type: 'discrete', defaultMin: 0, defaultMax: 1, defaultStep: 1, unit: '', icon: 'sun', category: 'comfort', description: 'Ambient light adaptive brightness' },
  powerMode: { code: 0xD6, name: 'Power Mode', type: 'discrete', defaultMin: 0, defaultMax: 4, defaultStep: 1, unit: '', icon: 'zap', category: 'power', description: 'Display power state' },
  inputSource: { code: 0x60, name: 'Input Source', type: 'discrete', defaultMin: 0, defaultMax: 15, defaultStep: 1, unit: '', icon: 'monitor', category: 'input', description: 'Active input source' },
};

export const COLOR_TEMP_VALUES = {
  3000: 'Warm (3000K)',
  4000: 'Warm White (4000K)',
  5000: 'Neutral Warm (5000K)',
  5500: 'Neutral (5500K)',
  6500: 'Standard / Daylight (6500K)',
  7500: 'Cool (7500K)',
  8200: 'Cool Blue (8200K)',
  9300: 'Very Cool (9300K)',
  10000: 'Ultra Cool (10000K)',
};

export const GAMMA_VALUES = {
  18: '1.8',
  20: '2.0',
  22: '2.2 (Standard)',
  24: '2.4',
  26: '2.6',
};

export const POWER_MODE_VALUES: { [key: number]: string } = {
  0: 'On',
  1: 'Standby',
  2: 'Suspend',
  3: 'Off',
  4: 'Deep Sleep',
};

export const INPUT_SOURCE_VALUES: { [key: number]: string } = {
  0x01: 'VGA',
  0x03: 'DVI',
  0x0F: 'DisplayPort',
  0x11: 'HDMI-1',
  0x12: 'HDMI-2',
  0x13: 'HDMI-3',
  0x14: 'HDMI-4',
  0x1F: 'USB-C',
  0x0B: 'Component',
  0x0C: 'Composite',
  0x0D: 'S-Video',
  0x80: 'DisplayPort-1',
  0x81: 'DisplayPort-2',
};

export const ASPECT_RATIO_VALUES: { [key: number]: string } = {
  0: 'Auto',
  1: '4:3',
  2: '16:9',
  3: '16:10',
  4: '21:9',
  5: '1:1',
};

export const RESPONSE_TIME_VALUES: { [key: number]: string } = {
  0: 'Off',
  1: 'Fast',
  2: 'Faster',
  3: 'Fastest',
};

export const OVSCAN_VALUES: { [key: number]: string } = {
  0: 'Off',
  1: 'On',
  2: 'Auto',
};

export const DYNAMIC_CONTRAST_VALUES: { [key: number]: string } = {
  0: 'Off',
  1: 'On',
};