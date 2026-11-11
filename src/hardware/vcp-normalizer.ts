import type { Monitor, MonitorCapabilities, MonitorSetting } from '../monitor-types';
import { VCP_CODES } from '../monitor-types';

const ID_ALIASES: Readonly<Record<string, string>> = {
  luminance: 'brightness',
  backlight: 'brightness',
  displayBrightness: 'brightness',
  pictureBrightness: 'brightness',
  pictureContrast: 'contrast',
  colorTemperature: 'colorTemp',
  whitePoint: 'colorTemp',
  colorSaturation: 'saturation',
  input: 'inputSource',
  source: 'inputSource',
  audioVolume: 'volume',
  audioMute: 'mute',
  lowBlueLight: 'blueLight',
  energySaving: 'ecoMode',
  powerState: 'powerMode',
  response: 'responseTime',
};

const CODE_TO_ID = new Map<number, string>();
for (const [id, metadata] of Object.entries(VCP_CODES)) {
  // In case a repository extension adds multiple labels for one VCP code,
  // retain the first canonical registry entry as the stable identifier.
  if (!CODE_TO_ID.has(metadata.code)) CODE_TO_ID.set(metadata.code, id);
}

function canonicalSettingId(id: string, vcpCode?: number): string {
  if (Object.prototype.hasOwnProperty.call(VCP_CODES, id)) return id;
  const alias = ID_ALIASES[id] ?? ID_ALIASES[id.replace(/[-_\s]/g, '')];
  if (alias && Object.prototype.hasOwnProperty.call(VCP_CODES, alias)) return alias;
  return (typeof vcpCode === 'number' && CODE_TO_ID.get(vcpCode)) || id;
}

function normalizeCapabilityMap(capabilities: MonitorCapabilities): MonitorCapabilities {
  const normalized: MonitorCapabilities = {};
  for (const [id, capability] of Object.entries(capabilities ?? {})) {
    const canonicalId = canonicalSettingId(id, capability?.vcpCode);
    // Prefer a concrete canonical probe over an alias collision.
    if (!normalized[canonicalId] || id === canonicalId) normalized[canonicalId] = { ...capability };
  }
  return normalized;
}

function normalizeSettings(settings: MonitorSetting[], capabilities: MonitorCapabilities): MonitorSetting[] {
  const normalized = new Map<string, MonitorSetting>();
  for (const setting of settings ?? []) {
    const id = canonicalSettingId(setting.id, setting.vcpCode);
    const canonical = VCP_CODES[id];
    const capability = capabilities[id];
    const adapted: MonitorSetting = {
      ...setting,
      id,
      name: canonical?.name ?? setting.name,
      vcpCode: setting.vcpCode ?? canonical?.code,
      min: capability?.min ?? setting.min,
      max: capability?.max ?? setting.max,
      step: capability?.step ?? setting.step,
      type: capability?.type ?? setting.type,
      category: canonical?.category ?? setting.category,
      description: canonical?.description ?? setting.description,
    };
    if (!normalized.has(id) || setting.id === id) normalized.set(id, adapted);
  }
  return [...normalized.values()];
}

/** Normalize backend-specific aliases to the stable app VCP setting identifiers. */
export function normalizeMonitorVcp(monitor: Monitor): Monitor {
  const capabilities = normalizeCapabilityMap(monitor.capabilities);
  return { ...monitor, capabilities, settings: normalizeSettings(monitor.settings, capabilities) };
}

/** Return a canonical VCP identifier for an ID, alias, or known VCP code. */
export function resolveCanonicalVcpId(id: string, vcpCode?: number): string {
  return canonicalSettingId(id, vcpCode);
}
