import React from 'react';
import type { Monitor, MonitorSetting } from '../monitor-types';
import {
  listBrandCalibrations,
  removeBrandCalibration,
  saveBrandCalibration,
  type BrandCalibrationProfile,
} from '../services/universal-control';
import { Icon } from './Icon';

interface BrandCalibrationPanelProps {
  monitor: Monitor;
  settings: MonitorSetting[];
  onApply: (profile: BrandCalibrationProfile) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BrandCalibrationPanel: React.FC<BrandCalibrationPanelProps> = ({ monitor, settings, onApply, showToast }) => {
  const brand = monitor.brand || monitor.manufacturer || 'Unknown';
  const [profiles, setProfiles] = React.useState<BrandCalibrationProfile[]>([]);

  const refresh = React.useCallback(() => setProfiles(listBrandCalibrations(brand)), [brand]);
  React.useEffect(refresh, [refresh]);

  const saveCurrent = () => {
    if (settings.length === 0) {
      showToast('No monitor settings are available to save', 'info');
      return;
    }
    try {
      saveBrandCalibration(monitor, settings, `${brand} calibration`);
      refresh();
      showToast(`Saved calibration for ${brand}`, 'success');
    } catch (error) {
      console.error('Failed to save brand calibration:', error);
      showToast('Could not save calibration in local storage', 'error');
    }
  };

  const deleteProfile = (profileId: string) => {
    try {
      removeBrandCalibration(profileId);
      refresh();
    } catch (error) {
      console.error('Failed to remove brand calibration:', error);
      showToast('Could not remove calibration', 'error');
    }
  };

  return (
    <section className="brand-calibration-panel" aria-label={`${brand} calibrations`}>
      <div className="sidebar-header">
        <h3 className="section-title"><Icon name="sliders" size={16} /> {brand} Calibration</h3>
        <button className="icon-btn" onClick={saveCurrent} disabled={settings.length === 0} aria-label={`Save ${brand} calibration`} title="Save current supported settings">
          <Icon name="plus" size={16} />
        </button>
      </div>
      {profiles.length === 0 ? (
        <p className="hint">Save this monitor’s current supported settings as a reusable {brand} calibration.</p>
      ) : (
        <ul className="calibration-list">
          {profiles.map((profile) => (
            <li className="calibration-item" key={profile.id}>
              <button className="calibration-apply" onClick={() => onApply(profile)} title={`Apply ${profile.name}`}>
                <span>{profile.name}</span>
                <small>{profile.model} · {new Date(profile.createdAt).toLocaleDateString()}</small>
              </button>
              <button className="icon-btn" onClick={() => deleteProfile(profile.id)} aria-label={`Delete ${profile.name}`} title="Delete calibration">
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
