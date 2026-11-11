import React from 'react';
import type { Monitor, MonitorSetting } from '../monitor-types';
import {
  exportBrandCalibrations, importBrandCalibrations, listBrandCalibrations, removeBrandCalibration,
  saveBrandCalibration, type BrandCalibrationProfile,
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
  const fileInput = React.useRef<HTMLInputElement>(null);
  const refresh = React.useCallback(() => setProfiles(listBrandCalibrations(brand, monitor.model)), [brand, monitor.model]);
  React.useEffect(refresh, [refresh]);

  const saveCurrent = () => {
    if (settings.length === 0) { showToast('No monitor settings are available to save', 'info'); return; }
    try {
      const name = window.prompt('Name this calibration profile:', `${brand} ${monitor.model} calibration`);
      if (name === null) return;
      saveBrandCalibration(monitor, settings, name);
      refresh();
      showToast(`Saved calibration for ${brand}`, 'success');
    } catch (error) {
      console.error('Failed to save brand calibration:', error);
      showToast('Could not save calibration in local storage', 'error');
    }
  };

  const deleteProfile = (profileId: string) => {
    try { removeBrandCalibration(profileId); refresh(); }
    catch (error) { console.error('Failed to remove brand calibration:', error); showToast('Could not remove calibration', 'error'); }
  };

  const exportProfiles = () => {
    try {
      const blob = new Blob([exportBrandCalibrations(brand)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monitor-calibrations-${brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { console.error('Calibration export failed:', error); showToast('Could not export calibration profiles', 'error'); }
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const count = importBrandCalibrations(await file.text());
      refresh();
      showToast(`Imported ${count} calibration profile${count === 1 ? '' : 's'}`, 'success');
    } catch (error) {
      console.error('Calibration import failed:', error);
      showToast(error instanceof Error ? error.message : 'Invalid calibration file', 'error');
    }
  };

  return (
    <section className="brand-calibration-panel" aria-label={`${brand} calibrations`}>
      <div className="sidebar-header">
        <h3 className="section-title"><Icon name="sliders" size={16} /> {brand} Calibration</h3>
        <div className="calibration-actions">
          <button className="icon-btn" onClick={exportProfiles} aria-label={`Export ${brand} calibrations`} title="Export profiles"><Icon name="download" size={15} /></button>
          <button className="icon-btn" onClick={() => fileInput.current?.click()} aria-label="Import calibrations" title="Import profiles"><Icon name="plus" size={16} /></button>
          <button className="icon-btn" onClick={saveCurrent} disabled={settings.length === 0} aria-label={`Save ${brand} calibration`} title="Save current supported settings"><Icon name="plus" size={16} /></button>
          <input ref={fileInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={importFile} aria-label="Import calibration JSON file" />
        </div>
      </div>
      <p className="calibration-hint">Saved locally for this brand and model. Export JSON to back up or share.</p>
      {profiles.length === 0 ? (
        <p className="hint">Save the current supported settings to create a reusable calibration.</p>
      ) : (
        <ul className="calibration-list">
          {profiles.map((profile) => (
            <li className="calibration-item" key={profile.id}>
              <button className="calibration-apply" onClick={() => onApply(profile)} title={`Apply ${profile.name}`}>
                <span>{profile.name}</span>
                <small>{profile.model} · {new Date(profile.createdAt).toLocaleDateString()}</small>
              </button>
              <button className="icon-btn" onClick={() => deleteProfile(profile.id)} aria-label={`Delete ${profile.name}`} title="Delete calibration"><Icon name="trash" size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
