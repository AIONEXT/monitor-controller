import type { Monitor } from '../monitor-types';

/**
 * Brand metadata is descriptive only: a brand match must never be treated as
 * proof that a feature is supported. Runtime VCP probing remains authoritative.
 */
export interface MonitorBrandProfile {
  name: string;
  aliases: readonly string[];
  families: readonly string[];
}

const BRAND_PROFILES: readonly MonitorBrandProfile[] = [
  { name: 'Acer', aliases: ['ACR', 'Acer'], families: ['Predator', 'Nitro', 'ConceptD'] },
  { name: 'AOC', aliases: ['AOC', 'TPV'], families: ['AGON'] },
  { name: 'Apple', aliases: ['Apple', 'APP'], families: ['Studio Display', 'Pro Display XDR'] },
  { name: 'ASUS', aliases: ['ASUS', 'ACI', 'ASUSTeK'], families: ['ROG', 'TUF Gaming', 'ProArt', 'ZenScreen'] },
  { name: 'BenQ', aliases: ['BenQ', 'BNQ'], families: ['ZOWIE', 'MOBIUZ', 'DesignVue'] },
  { name: 'Dell', aliases: ['Dell', 'DEL'], families: ['UltraSharp', 'Alienware', 'S Series', 'P Series'] },
  { name: 'EIZO', aliases: ['EIZO', 'ENC'], families: ['ColorEdge', 'FlexScan', 'FORIS'] },
  { name: 'Gigabyte', aliases: ['Gigabyte', 'GIG'], families: ['AORUS', 'M Series'] },
  { name: 'HP', aliases: ['HP', 'HWP', 'Hewlett-Packard'], families: ['OMEN', 'Z Display', 'EliteDisplay'] },
  { name: 'Huawei', aliases: ['Huawei', 'HUA'], families: ['MateView'] },
  { name: 'Lenovo', aliases: ['Lenovo', 'LEN'], families: ['ThinkVision', 'Legion'] },
  { name: 'LG', aliases: ['LG', 'GSM', 'Goldstar'], families: ['UltraGear', 'UltraFine', 'UltraWide'] },
  { name: 'MSI', aliases: ['MSI', 'Micro-Star'], families: ['Optix', 'MAG', 'MPG', 'Modern'] },
  { name: 'Philips', aliases: ['Philips', 'PHL'], families: ['Brilliance', 'Momentum', 'Evnia'] },
  { name: 'Samsung', aliases: ['Samsung', 'SAM'], families: ['Odyssey', 'ViewFinity', 'Smart Monitor'] },
  { name: 'Sharp', aliases: ['Sharp', 'SHP'], families: ['AQUOS'] },
  { name: 'ViewSonic', aliases: ['ViewSonic', 'VSC'], families: ['Elite', 'ColorPro', 'VX'] },
] as const;

function normalize(value: string | undefined): string {
  return (value ?? '').normalize('NFKD').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/** Match a brand from EDID manufacturer text, marketing manufacturer, or model family. */
export function identifyMonitorBrand(monitor: Pick<Monitor, 'manufacturer' | 'model' | 'name'>): MonitorBrandProfile | undefined {
  const manufacturer = normalize(monitor.manufacturer);
  const model = normalize(monitor.model);
  const name = normalize(monitor.name);

  return BRAND_PROFILES.find((profile) => {
    const aliases = profile.aliases.map(normalize);
    if (aliases.some((alias) => alias && (manufacturer === alias || manufacturer.includes(alias)))) {
      return true;
    }

    // Model-family matching is deliberately conservative; it only supplies a
    // UI brand label when manufacturer data is absent or unrecognized.
    return !manufacturer || manufacturer === 'unknown'
      ? profile.families.some((family) => {
        const normalizedFamily = normalize(family);
        return normalizedFamily && (model.includes(normalizedFamily) || name.includes(normalizedFamily));
      })
      : false;
  });
}

export function withBrandMetadata(monitor: Monitor): Monitor {
  const profile = identifyMonitorBrand(monitor);
  return {
    ...monitor,
    brand: profile?.name ?? monitor.brand ?? (monitor.manufacturer !== 'Unknown' ? monitor.manufacturer : undefined),
  };
}

/** Expose the supported brand catalogue for compatibility UI and docs. */
export function getMonitorBrandProfiles(): readonly MonitorBrandProfile[] {
  return BRAND_PROFILES;
}
