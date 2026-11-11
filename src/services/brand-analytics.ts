import type { Monitor } from '../monitor-types';
import { normalizeMonitorVcp } from './vcp-normalizer';

export interface BrandCompatibilitySummary {
  brand: string;
  monitorCount: number;
  ddcCount: number;
  supportedControls: number;
  totalControls: number;
  coveragePercent: number;
  models: string[];
}

/** Summarize only positively probed capabilities; unknown is not counted as supported. */
export function getBrandCompatibilityAnalytics(monitors: readonly Monitor[]): BrandCompatibilitySummary[] {
  const groups = new Map<string, { monitorCount: number; ddcCount: number; supported: number; total: number; models: Set<string> }>();

  for (const original of monitors) {
    const monitor = normalizeMonitorVcp(original);
    const brand = monitor.brand || monitor.manufacturer || 'Unknown';
    let summary = groups.get(brand);
    if (!summary) {
      summary = { monitorCount: 0, ddcCount: 0, supported: 0, total: 0, models: new Set<string>() };
      groups.set(brand, summary);
    }
    summary.monitorCount += 1;
    if (monitor.ddcSupported === true || Object.values(monitor.capabilities).some((capability) => capability.supported)) summary.ddcCount += 1;
    summary.models.add(monitor.model && monitor.model !== 'Unknown' ? monitor.model : monitor.name);
    for (const capability of Object.values(monitor.capabilities)) {
      summary.total += 1;
      if (capability.supported) summary.supported += 1;
    }
  }

  return [...groups.entries()].map(([brand, value]) => ({
    brand,
    monitorCount: value.monitorCount,
    ddcCount: value.ddcCount,
    supportedControls: value.supported,
    totalControls: value.total,
    coveragePercent: value.total ? Math.round((value.supported / value.total) * 100) : 0,
    models: [...value.models].sort((a, b) => a.localeCompare(b)),
  })).sort((a, b) => b.monitorCount - a.monitorCount || a.brand.localeCompare(b.brand));
}
