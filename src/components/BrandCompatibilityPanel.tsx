import React from 'react';
import type { Monitor } from '../monitor-types';
import { getBrandCompatibilityAnalytics } from '../services/brand-analytics';
import { Icon } from './Icon';

interface BrandCompatibilityPanelProps { monitors: Monitor[] }

export const BrandCompatibilityPanel: React.FC<BrandCompatibilityPanelProps> = ({ monitors }) => {
  const summaries = React.useMemo(() => getBrandCompatibilityAnalytics(monitors), [monitors]);
  if (summaries.length === 0) return null;
  return (
    <section className="brand-analytics" aria-label="Brand compatibility analytics">
      <h3 className="section-title"><Icon name="layers" size={16} /> Compatibility</h3>
      <p className="analytics-caption">Capability data is based on device probes, not brand assumptions.</p>
      <div className="analytics-list">
        {summaries.map((summary) => (
          <article className="analytics-card" key={summary.brand}>
            <div className="analytics-card__top"><strong>{summary.brand}</strong><span className="analytics-count">{summary.monitorCount} {summary.monitorCount === 1 ? 'display' : 'displays'}</span></div>
            <div className="analytics-meter" role="img" aria-label={`${summary.coveragePercent}% of probed controls supported`}><span style={{ width: `${summary.coveragePercent}%` }} /></div>
            <div className="analytics-card__meta"><span>{summary.coveragePercent}% probed</span><span>{summary.supportedControls}/{summary.totalControls} controls</span></div>
            <small>{summary.models.join(' · ')}</small>
          </article>
        ))}
      </div>
    </section>
  );
};
