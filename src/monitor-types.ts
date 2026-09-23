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
}

export interface MonitorCapabilities {
  [settingId: string]: {
    supported: boolean;
    min: number;
    max: number;
    step: number;
    vcpCode: number;
    type: 'continuous' | 'discrete';
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
  };
}

export const VCP_CODES: VCPCodeMap = {
  brightness: { code: 0x10, name: 'Brightness', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'sun' },
  contrast: { code: 0x12, name: 'Contrast', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'contrast' },
  sharpness: { code: 0x8D, name: 'Sharpness', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'focus' },
  colorTemp: { code: 0x14, name: 'Color Temperature', type: 'discrete', defaultMin: 4000, defaultMax: 9300, defaultStep: 100, unit: 'K', icon: 'thermometer' },
  gamma: { code: 0x72, name: 'Gamma', type: 'discrete', defaultMin: 18, defaultMax: 26, defaultStep: 1, unit: '', icon: 'chart' },
  hue: { code: 0x16, name: 'Hue', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'palette' },
  saturation: { code: 0x18, name: 'Saturation', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'droplet' },
  blueLight: { code: 0xE0, name: 'Blue Light Filter', type: 'continuous', defaultMin: 0, defaultMax: 100, defaultStep: 1, unit: '%', icon: 'shield' },
  autoBrightness: { code: 0xD0, name: 'Auto Brightness', type: 'discrete', defaultMin: 0, defaultMax: 1, defaultStep: 1, unit: '', icon: 'sun' },
  powerMode: { code: 0xD6, name: 'Power Mode', type: 'discrete', defaultMin: 0, defaultMax: 4, defaultStep: 1, unit: '', icon: 'zap' },
  inputSource: { code: 0x60, name: 'Input Source', type: 'discrete', defaultMin: 0, defaultMax: 15, defaultStep: 1, unit: '', icon: 'monitor' },
};

export const COLOR_TEMP_VALUES = {
  4000: 'Warm (4000K)',
  5000: 'Neutral Warm (5000K)',
  5500: 'Neutral (5500K)',
  6500: 'Standard (6500K)',
  7500: 'Cool (7500K)',
  8200: 'Cool Blue (8200K)',
  9300: 'Very Cool (9300K)',
};

export const GAMMA_VALUES = {
  18: '1.8',
  20: '2.0',
  22: '2.2 (Standard)',
  24: '2.4',
  26: '2.6',
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
};