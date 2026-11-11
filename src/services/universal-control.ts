import type { Monitor, MonitorSetting } from '../monitor-types';

export interface UniversalPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  values: Readonly<Record<string, number>>;
}

// Values for percentage controls are normalized percentages, not hardware VCP
// values. The resolver maps them to each monitor's probed range before writing.
export const UNIVERSAL_PRESETS: readonly UniversalPreset[] = [
  { id: 'standard', name: 'Standard', icon: 'monitor', description: 'Balanced everyday viewing', values: { brightness: 70, contrast: 70, sharpness: 50, colorTemp: 6500, gamma: 22, blueLight: 0 } },
  { id: 'gaming', name: 'Gaming', icon: 'gamepad', description: 'Responsive picture with comfortable brightness', values: { brightness: 75, contrast: 70, sharpness: 50, colorTemp: 6500, gamma: 22, blueLight: 0, responseTime: 1, gameMode: 1 } },
  { id: 'movie', name: 'Movie', icon: 'film', description: 'Warm, cinematic picture', values: { brightness: 55, contrast: 70, sharpness: 45, colorTemp: 5500, gamma: 22, blueLight: 10 } },
  { id: 'reading', name: 'Reading', icon: 'book', description: 'Reduced brightness and blue-light setting', values: { brightness: 40, contrast: 60, sharpness: 45, colorTemp: 5000, gamma: 22, blueLight: 35 } },
  { id: 'office', name: 'Office', icon: 'briefcase', description: 'Moderate brightness for productivity', values: { brightness: 60, contrast: 65, sharpness: 50, colorTemp: 6500, gamma: 22, blueLight: 0 } },
  { id: 'creator', name: 'Creator', icon: 'palette', description: 'Neutral color temperature; calibration remains monitor-dependent', values: { brightness: 65, contrast: 65, sharpness: 45, colorTemp: 6500, gamma: 22, blueLight: 0 } },
  { id: 'night', name: 'Night Shift', icon: 'moon', description: 'Lower brightness and warmer white point where supported', values: { brightness: 30, contrast: 55, sharpness: 40, colorTemp: 4000, gamma: 22, blueLight: 50 } },
  { id: 'energy', name: 'Energy Saver', icon: 'zap', description: 'Lower display brightness to reduce power use', values: { brightness: 35, contrast: 60, ecoMode: 1, blueLight: 0 } },
  { id: 'custom', name: 'Custom', icon: 'sliders', description: 'Your personalized settings', values: {} },
];

export interface SafeRange {
  min: number;
  max: number;
}

/**
 * Conservative caps apply to preset suggestions only, not manual controls.
 * They are normalized percentages and never imply a brand feature is supported.
 * Capability data from the connected device remains the final authority.
 */
const DEFAULT_PRESET_RANGES: Readonly<Record<string, SafeRange>> = {
  brightness: { min: 10, max: 85 },
  contrast: { min: 20, max: 80 },
  sharpness: { min: 0, max: 70 },
};

const BRAND_PRESET_RANGES: Readonly<Record<string, Readonly<Record<string, SafeRange>>>> = {
  Acer: { brightness: { min: 10, max: 80 } },
  AOC: { brightness: { min: 10, max: 80 } },
  Apple: { brightness: { min: 10, max: 80 } },
  ASUS: { brightness: { min: 10, max: 80 } },
  BenQ: { brightness: { min: 10, max: 80 } },
  Dell: { brightness: { min: 10, max: 80 } },
  EIZO: { brightness: { min: 10, max: 75 } },
  Gigabyte: { brightness: { min: 10, max: 80 } },
  HP: { brightness: { min: 10, max: 80 } },
  Huawei: { brightness: { min: 10, max: 80 } },
  Lenovo: { brightness: { min: 10, max: 80 } },
  LG: { brightness: { min: 10, max: 80 } },
  MSI: { brightness: { min: 10, max: 80 } },
  Philips: { brightness: { min: 10, max: 80 } },
  Samsung: { brightness: { min: 10, max: 80 } },
  Sharp: { brightness: { min: 10, max: 80 } },
  ViewSonic: { brightness: { min: 10, max: 80 } },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, min: number, max: number, step: number): number {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  return clamp(min + Math.round((value - min) / safeStep) * safeStep, min, max);
}

function rangeFor(monitor: Monitor, setting: MonitorSetting): SafeRange {
  const defaultRange = DEFAULT_PRESET_RANGES[setting.id];
  const brandRange = monitor.brand ? BRAND_PRESET_RANGES[monitor.brand]?.[setting.id] : undefined;
  return brandRange ?? defaultRange ?? { min: 0, max: 100 };
}

/** Convert a normalized percentage to the monitor's real range, then snap it. */
export function resolvePresetValue(monitor: Monitor, setting: MonitorSetting, target: number): number {
  const min = Number.isFinite(setting.min) ? setting.min : 0;
  const max = Number.isFinite(setting.max) && setting.max >= min ? setting.max : 100;
  const normalized = clamp(target, 0, 100);
  const presetRange = rangeFor(monitor, setting);
  const safePercent = clamp(normalized, presetRange.min, presetRange.max);
  const value = setting.unit === '%' || setting.id === 'brightness' || setting.id === 'contrast' || setting.id === 'sharpness'
    ? min + (safePercent / 100) * (max - min)
    : target;
  return snapToStep(clamp(value, min, max), min, max, setting.step);
}

export function resolvePreset(monitor: Monitor, settings: readonly MonitorSetting[], presetId: string): Array<{ settingId: string; value: number }> {
  const preset = UNIVERSAL_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset || presetId === 'custom') return [];
  const available = new Map(settings.filter((setting) => setting.writable && monitor.capabilities[setting.id]?.supported).map((setting) => [setting.id, setting]));
  return Object.entries(preset.values).flatMap(([settingId, target]) => {
    const setting = available.get(settingId);
    return setting ? [{ settingId, value: resolvePresetValue(monitor, setting, target) }] : [];
  });
}

export interface BrandCalibrationProfile {
  id: string;
  brand: string;
  model: string;
  name: string;
  createdAt: number;
  values: Record<string, number>;
}

const CALIBRATION_STORAGE_KEY = 'monitor-controller.brand-calibrations.v1';

function readCalibrationProfiles(): BrandCalibrationProfile[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CALIBRATION_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is BrandCalibrationProfile => Boolean(
      item && typeof item.id === 'string' && typeof item.brand === 'string'
      && typeof item.model === 'string' && typeof item.name === 'string'
      && typeof item.createdAt === 'number' && item.values && typeof item.values === 'object',
    ));
  } catch {
    return [];
  }
}

function writeCalibrationProfiles(profiles: BrandCalibrationProfile[]): void {
  localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(profiles));
}

export function listBrandCalibrations(brand: string): BrandCalibrationProfile[] {
  return readCalibrationProfiles().filter((profile) => profile.brand === brand);
}

export function saveBrandCalibration(monitor: Monitor, settings: readonly MonitorSetting[], name: string): BrandCalibrationProfile {
  const brand = monitor.brand || monitor.manufacturer || 'Unknown';
  const values = Object.fromEntries(settings.filter((setting) => setting.writable).map((setting) => [setting.id, setting.value]));
  const profile: BrandCalibrationProfile = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    brand,
    model: monitor.model,
    name: name.trim() || `${brand} calibration`,
    createdAt: Date.now(),
    values,
  };
  writeCalibrationProfiles([...readCalibrationProfiles(), profile]);
  return profile;
}

export function removeBrandCalibration(profileId: string): void {
  writeCalibrationProfiles(readCalibrationProfiles().filter((profile) => profile.id !== profileId));
}

/** Re-map saved values to the current monitor ranges and supported controls. */
export function resolveCalibration(monitor: Monitor, settings: readonly MonitorSetting[], profile: BrandCalibrationProfile): Array<{ settingId: string; value: number }> {
  const available = new Map(settings.filter((setting) => setting.writable && monitor.capabilities[setting.id]?.supported).map((setting) => [setting.id, setting]));
  return Object.entries(profile.values).flatMap(([settingId, savedValue]) => {
    const setting = available.get(settingId);
    if (!setting || !Number.isFinite(savedValue)) return [];
    const min = Number.isFinite(setting.min) ? setting.min : 0;
    const max = Number.isFinite(setting.max) && setting.max >= min ? setting.max : 100;
    return [{ settingId, value: snapToStep(clamp(savedValue, min, max), min, max, setting.step) }];
  });
}
