import React, { useState, useEffect } from 'react';
import { Monitor, MonitorProfile } from '../monitor-types';
import { enterprise } from '../services/enterprise-service';
import { Icon } from './Icon';

interface ProfileManagerProps {
  monitors: Monitor[];
  onApply: (profile: MonitorProfile) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({ monitors, onApply, showToast }) => {
  const [profiles, setProfiles] = useState<MonitorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const p = await enterprise.getProfiles();
      setProfiles(p);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const captureCurrentSettings = (): Record<string, Record<string, number>> => {
    const snapshot: Record<string, Record<string, number>> = {};
    for (const monitor of monitors) {
      snapshot[monitor.id] = {};
      for (const setting of monitor.settings) {
        snapshot[monitor.id][setting.id] = setting.value;
      }
    }
    return snapshot;
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      showToast('Profile name is required', 'error');
      return;
    }
    try {
      const profile: MonitorProfile = {
        id: `profile-${Date.now()}`,
        name: newName.trim(),
        description: newDesc.trim() || 'Saved monitor configuration',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: captureCurrentSettings(),
        isDefault: false,
        isShared: false,
      };
      await enterprise.saveProfile(profile);
      setNewName('');
      setNewDesc('');
      setCreating(false);
      await loadProfiles();
      showToast(`Profile "${profile.name}" saved`, 'success');
    } catch (err) {
      console.error('Failed to save profile:', err);
      showToast('Failed to save profile', 'error');
    }
  };

  const handleApply = async (profile: MonitorProfile) => {
    try {
      await onApply(profile);
      showToast(`Profile "${profile.name}" applied`, 'success');
    } catch (err) {
      console.error('Failed to apply profile:', err);
      showToast('Failed to apply profile', 'error');
    }
  };

  const handleDelete = async (profile: MonitorProfile) => {
    try {
      await enterprise.deleteProfile(profile.id);
      await loadProfiles();
      showToast(`Profile "${profile.name}" deleted`, 'success');
    } catch (err) {
      console.error('Failed to delete profile:', err);
      showToast('Failed to delete profile', 'error');
    }
  };

  const handleExport = (profile: MonitorProfile) => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="profile-manager loading">Loading profiles…</div>;
  }

  return (
    <div className="profile-manager">
      <div className="profile-header">
        <h3><Icon name="layers" size={18} /> Configuration Profiles</h3>
        <button
          className="btn-primary btn-sm"
          onClick={() => setCreating(!creating)}
          aria-label="Create profile from current settings"
        >
          <Icon name="plus" size={14} />
          New Profile
        </button>
      </div>

      {creating && (
        <div className="profile-create-form">
          <input
            type="text"
            placeholder="Profile name (e.g. Office Day)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="profile-input"
            aria-label="Profile name"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="profile-input"
            aria-label="Profile description"
          />
          <div className="profile-create-actions">
            <button className="btn-primary btn-sm" onClick={handleCreate}>
              <Icon name="check" size={14} /> Save Current Settings
            </button>
            <button className="btn-ghost btn-sm" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="profile-empty">
          <Icon name="layers" size={32} />
          <p>No profiles yet. Capture your current monitor settings as a reusable profile.</p>
        </div>
      ) : (
        <div className="profile-list">
          {profiles.map(profile => (
            <div key={profile.id} className="profile-card">
              <div className="profile-info">
                <span className="profile-name">{profile.name}</span>
                <span className="profile-desc">{profile.description}</span>
                <span className="profile-meta">
                  {Object.keys(profile.settings).length} monitor(s) · updated {new Date(profile.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="profile-actions">
                <button className="btn-primary btn-sm" onClick={() => handleApply(profile)} title="Apply profile">
                  <Icon name="check" size={14} /> Apply
                </button>
                <button className="icon-btn" onClick={() => handleExport(profile)} title="Export profile" aria-label={`Export ${profile.name}`}>
                  <Icon name="download" size={14} />
                </button>
                <button className="icon-btn danger" onClick={() => handleDelete(profile)} title="Delete profile" aria-label={`Delete ${profile.name}`}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
