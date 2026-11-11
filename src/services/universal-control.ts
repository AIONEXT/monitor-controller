import type { Monitor, MonitorSetting } from '../monitor-types';

export interface UniversalPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  values: Readonly<Record<string, number>>;
}

export const UNIVERSAL_PRESETS: readonly UniversalPreset[] = [
  { id: 'standard', name: 'Standard', icon: 'monitor', description: 'Balanced everyday viewing', values: { brightness: 70, contrast: 70, sharpness: 50, colorTemp: 6500, gamma: 22, blueLight: 0 } },
  { id: 'gaming', name: 'Gaming', icon: 'gamepad', description: 'Responsive picture with comfortable brightness', values: { brightness: 75, contrast: 70, sharpness: 50, colorTemp: 6500, gamma: 22, blueLight: 0, responseTime: 1, gameMode: 1 } },
  { id: 'movie', name: 'Movie', icon: 'film', description: 'Warm, cinematic picture', values: { brightness: 55, contrast: 70, sharpness: 45, colorTemp: 5500, gamma: 22, blueLight: 10 } },
  { id: 'reading', name: 'Reading', icon: 'book', description: 'Reduced brightness and blue-light setting', values: { brightness: 40, contrast: 60, sharpness: 45, colorTemp: 5000, gamma: 22, blueLight: 35 } },
  { id: 'office', name: 'Office', icon: 'layers', description: 'Moderate brightness for productivity', values: { brightness: 60, contrast: 65, sharpness: 50, colorTemp: 6500, gamma: 22, blueLight: 0 } },
  { id: 'creator', name: 'Creator', icon: 'palette', description: 'Neutral color temperature; calibration remains monitor-dependent', values: { brightness: 65, contrast: 65, sharpness: 45, colorTemp: 6500, gamma: 22, blueLight: 0 } },
  { id: 'night', name: 'Night Shift', icon: 'circle', description: 'Lower brightness and warmer white point where supported', values: { brightness: 30, contrast: 55, sharpness: 40, colorTemp: 4000, gamma: 22, blueLight: 50 } },
  { id: 'energy', name: 'Energy Saver', icon: 'zap', description: 'Lower display brightness to reduce power use', values: { brightness: 35, contrast: 60, ecoMode: 1, blueLight: 0 } },
  { id: 'custom', name: 'Custom', icon: 'sliders', description: 'Your personalized settings', values: {} },
];

export interface SafeRange { min: number; max: number }
const DEFAULT_PRESET_RANGES: Readonly<Record<string, SafeRange>> = {
  brightness: { min: 10, max: 85 }, contrast: { min: 20, max: 80 }, sharpness: { min: 0, max: 70 },
};
const BRAND_PRESET_RANGES: Readonly<Record<string, Readonly<Record<string, SafeRange>>>> = {
  Acer: { brightness: { min: 10, max: 80 } }, AOC: { brightness: { min: 10, max: 80 } }, Apple: { brightness: { min: 10, max: 80 } },
  ASUS: { brightness: { min: 10, max: 80 } }, BenQ: { brightness: { min: 10, max: 80 } }, Dell: { brightness: { min: 10, max: 80 } },
  EIZO: { brightness: { min: 10, max: 75 } }, Gigabyte: { brightness: { min: 10, max: 80 } }, HP: { brightness: { min: 10, max: 80 } },
  Huawei: { brightness: { min: 10, max: 80 } }, Lenovo: { brightness: { min: 10, max: 80 } }, LG: { brightness: { min: 10, max: 80 } },
  MSI: { brightness: { min: 10, max: 80 } }, Philips: { brightness: { min: 10, max: 80 } }, Samsung: { brightness: { min: 10, max: 80 } },
  Sharp: { brightness: { min: 10, max: 80 } }, ViewSonic: { brightness: { min: 10, max: 80 } },
};

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
function snapToStep(value: number, min: number, max: number, step: number): number {
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
  return clamp(min + Math.round((value - min) / safeStep) * safeStep, min, max);
}
function isPercentSetting(setting: MonitorSetting): boolean {
  return setting.unit === '%' || ['brightness', 'contrast', 'sharpness'].includes(setting.id);
}
function rangeFor(monitor: Monitor, setting: MonitorSetting): SafeRange {
  return (monitor.brand ? BRAND_PRESET_RANGES[monitor.brand]?.[setting.id] : undefined)
    ?? DEFAULT_PRESET_RANGES[setting.id] ?? { min: 0, max: 100 };
}

export function resolvePresetValue(monitor: Monitor, setting: MonitorSetting, target: number): number {
  const min = Number.isFinite(setting.min) ? setting.min : 0;
  const max = Number.isFinite(setting.max) && setting.max >= min ? setting.max : 100;
  if (!Number.isFinite(target)) return clamp(setting.value, min, max);
  if (!isPercentSetting(setting)) return snapToStep(clamp(target, min, max), min, max, setting.step);
  const safePercent = clamp(target, rangeFor(monitor, setting).min, rangeFor(monitor, setting).max);
  return snapToStep(min + (safePercent / 100) * (max - min), min, max, setting.step);
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
  normalizedValues?: Record<string, number>;
  deviceFingerprint?: string;
  schemaVersion?: number;
}

interface CalibrationStoreV2 { schemaVersion: 2; updatedAt: number; profiles: BrandCalibrationProfile[] }
export const CALIBRATION_STORAGE_KEY = 'monitor-controller.brand-calibrations.v2';
const LEGACY_KEYS = ['monitor-controller.brand-calibrations.v1'];
const MAX_PROFILES = 200;

function fingerprint(monitor: Monitor): string {
  return [monitor.brand || monitor.manufacturer || 'Unknown', monitor.model || 'Unknown', monitor.serialNumber || ''].join('|').toLowerCase();
}

function parseProfiles(value: unknown): BrandCalibrationProfile[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is BrandCalibrationProfile => Boolean(
    item && typeof item.id === 'string' && typeof item.brand === 'string' && typeof item.model === 'string'
    && typeof item.name === 'string' && typeof item.createdAt === 'number' && item.values && typeof item.values === 'object',
  )).slice(-MAX_PROFILES);
}

function readCalibrationProfiles(): BrandCalibrationProfile[] {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'profiles' in parsed) return parseProfiles((parsed as CalibrationStoreV2).profiles);
      return parseProfiles(parsed);
    }
    for (const legacyKey of LEGACY_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const profiles = parseProfiles(JSON.parse(legacyRaw)).map((profile) => ({ ...profile, schemaVersion: 2 }));
      writeCalibrationProfiles(profiles);
      return profiles;
    }
  } catch (error) {
    console.warn('Calibration store could not be read; ignoring invalid data.', error);
  }
  return [];
}

function writeCalibrationProfiles(profiles: BrandCalibrationProfile[]): void {
  const store: CalibrationStoreV2 = { schemaVersion: 2, updatedAt: Date.now(), profiles: profiles.slice(-MAX_PROFILES) };
  localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(store));
}

export function listBrandCalibrations(brand: string, model?: string): BrandCalibrationProfile[] {
  const normalizedBrand = brand.toLowerCase();
  return readCalibrationProfiles().filter((profile) => profile.brand.toLowerCase() === normalizedBrand
    && (!model || profile.model.toLowerCase() === model.toLowerCase() || profile.model === '*'))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function saveBrandCalibration(monitor: Monitor, settings: readonly MonitorSetting[], name: string): BrandCalibrationProfile {
  const brand = monitor.brand || monitor.manufacturer || 'Unknown';
  const writable = settings.filter((setting) => setting.writable && Number.isFinite(setting.value));
  const values = Object.fromEntries(writable.map((setting) => [setting.id, setting.value]));
  const normalizedValues = Object.fromEntries(writable.map((setting) => {
    const min = Number.isFinite(setting.min) ? setting.min : 0;
    const max = Number.isFinite(setting.max) && setting.max > min ? setting.max : min + 1;
    return [setting.id, clamp((setting.value - min) / (max - min), 0, 1)];
  }));
  const profile: BrandCalibrationProfile = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, brand, model: monitor.model || 'Unknown',
    name: name.trim() || `${brand} calibration`, createdAt: Date.now(), values, normalizedValues,
    deviceFingerprint: fingerprint(monitor), schemaVersion: 2,
  };
  writeCalibrationProfiles([...readCalibrationProfiles(), profile]);
  return profile;
}

export function removeBrandCalibration(profileId: string): void {
  writeCalibrationProfiles(readCalibrationProfiles().filter((profile) => profile.id !== profileId));
}

export function exportBrandCalibrations(brand?: string): string {
  const profiles = readCalibrationProfiles().filter((profile) => !brand || profile.brand.toLowerCase() === brand.toLowerCase());
  return JSON.stringify({ format: 'monitor-controller-calibrations', schemaVersion: 2, exportedAt: new Date().toISOString(), profiles }, null, 2);
}

export function importBrandCalibrations(json: string): number {
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !('format' in parsed)
    || (parsed as { format: unknown }).format !== 'monitor-controller-calibrations'
    || !('profiles' in parsed)) throw new Error('Unsupported calibration file format');
  const imported = parseProfiles((parsed as { profiles: unknown }).profiles);
  if (imported.length === 0) throw new Error('No valid calibration profiles found');
  const existing = readCalibrationProfiles();
  const byId = new Map(existing.map((profile) => [profile.id, profile]));
  for (const profile of imported) byId.set(profile.id, { ...profile, schemaVersion: 2 });
  const merged = [...byId.values()].slice(-MAX_PROFILES);
  writeCalibrationProfiles(merged);
  return imported.length;
}

/** Apply exact model/device calibrations first; normalized values adapt across compatible ranges. */
export function resolveCalibration(monitor: Monitor, settings: readonly MonitorSetting[], profile: BrandCalibrationProfile): Array<{ settingId: string; value: number }> {
  const available = new Map(settings.filter((setting) => setting.writable && monitor.capabilities[setting.id]?.supported).map((setting) => [setting.id, setting]));
  return Object.entries(profile.values).flatMap(([settingId, savedValue]) => {
    const setting = available.get(settingId);
    if (!setting || !Number.isFinite(savedValue)) return [];
    const min = Number.isFinite(setting.min) ? setting.min : 0;
    const max = Number.isFinite(setting.max) && setting.max >= min ? setting.max : 100;
    const normalized = profile.normalizedValues?.[settingId];
    const isSameDevice = profile.deviceFingerprint === fingerprint(monitor);
    const value = Number.isFinite(normalized) && !isSameDevice ? min + clamp(normalized as number, 0, 1) * (max - min) : savedValue;
    return [{ settingId, value: snapToStep(clamp(value, min, max), min, max, setting.step) }];
  });
}
