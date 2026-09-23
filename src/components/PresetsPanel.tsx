import React from 'react';
import { Icon, type IconName } from './Icon';

interface Preset {
  id: string;
  name: string;
  icon: IconName;
  description: string;
}

interface PresetsPanelProps {
  presets: Preset[];
  activePreset: string;
  onApply: (presetId: string) => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ presets, activePreset, onApply }) => {
  return (
    <div className="presets-panel">
      <h3 className="section-title">
        <Icon name="sliders" size={16} />
        Presets
      </h3>
      <div className="presets-list">
        {presets.map(preset => (
          <button
            key={preset.id}
            className={`preset-btn ${activePreset === preset.id ? 'active' : ''}`}
            onClick={() => onApply(preset.id)}
            title={preset.description}
          >
            <div className="preset-icon">
              <Icon name={preset.icon} size={20} />
            </div>
            <div className="preset-info">
              <span className="preset-name">{preset.name}</span>
              <span className="preset-desc">{preset.description}</span>
            </div>
            {activePreset === preset.id && <Icon name="check" size={16} className="check-icon" />}
          </button>
        ))}
      </div>
    </div>
  );
};