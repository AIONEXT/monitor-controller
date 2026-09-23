import React from 'react';
import { Monitor, MonitorSetting, MonitorCapabilities, VCP_CODES, COLOR_TEMP_VALUES, GAMMA_VALUES, INPUT_SOURCE_VALUES } from '../monitor-types';
import { SettingSlider } from './SettingSlider';
import { SettingSelect } from './SettingSelect';
import { Icon } from './Icon';

interface SettingsPanelProps {
  monitor: Monitor;
  settings: MonitorSetting[];
  capabilities: MonitorCapabilities;
  onChange: (settingId: string, value: number) => void;
  onReset: () => void;
}

const SETTING_GROUPS = {
  'Display': ['brightness', 'contrast', 'sharpness'],
  'Color': ['colorTemp', 'gamma', 'hue', 'saturation'],
  'Comfort': ['blueLight'],
  'Advanced': ['autoBrightness', 'powerMode', 'inputSource'],
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  monitor, 
  settings, 
  capabilities, 
  onChange, 
  onReset 
}) => {
  const settingMap = new Map(settings.map(s => [s.id, s]));

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <div className="monitor-title">
          <Icon name="monitor" size={20} />
          <div>
            <h2>{monitor.name}</h2>
            <p>{monitor.manufacturer} {monitor.model} {monitor.diagonalInches && `(${monitor.diagonalInches}"`}</p>
          </div>
        </div>
        <div className="panel-actions">
          <button className="btn-secondary" onClick={onReset} title="Reset to defaults">
            <Icon name="refresh" size={16} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {Object.entries(SETTING_GROUPS).map(([groupName, settingIds]) => {
          const groupSettings = settingIds
            .map(id => ({ id, setting: settingMap.get(id) }))
            .filter(({ id, setting }) => setting !== undefined && capabilities[id]?.supported)
            .map(({ setting }) => setting!) as MonitorSetting[];

          if (groupSettings.length === 0) return null;

          return (
            <div key={groupName} className="setting-group">
              <h3 className="group-title">{groupName}</h3>
              <div className="group-settings">
                {groupSettings.map(setting => {
                  const vcpInfo = VCP_CODES[setting.id];
                  const isDiscrete = vcpInfo?.type === 'discrete';
                  
                  if (isDiscrete && (setting.id === 'colorTemp' || setting.id === 'gamma' || setting.id === 'inputSource')) {
                    return (
                      <SettingSelect
                        key={setting.id}
                        setting={setting}
                        options={getSelectOptions(setting.id)}
                        onChange={onChange}
                      />
                    );
                  }
                  
                  return (
                    <SettingSlider
                      key={setting.id}
                      setting={setting}
                      onChange={onChange}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {settings.length === 0 && (
        <div className="no-settings">
          <Icon name="info" size={32} />
          <h3>No Adjustable Settings Found</h3>
          <p>This monitor may not support DDC/CI, or DDC/CI is disabled in the monitor's OSD menu.</p>
          <div className="troubleshoot">
            <h4>Troubleshooting:</h4>
            <ul>
              <li>Enable DDC/CI in your monitor's OSD (On-Screen Display) settings</li>
              <li>Ensure you're using a direct DisplayPort or HDMI connection (not through a dock/KVM)</li>
              <li>On Linux: install <code>ddcutil</code> and add user to <code>i2c</code> group</li>
              <li>On Windows: run as administrator for full access</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

function getSelectOptions(settingId: string): { value: number; label: string }[] {
  switch (settingId) {
    case 'colorTemp':
      return Object.entries(COLOR_TEMP_VALUES).map(([value, label]) => ({
        value: parseInt(value),
        label,
      }));
    case 'gamma':
      return Object.entries(GAMMA_VALUES).map(([value, label]) => ({
        value: parseInt(value),
        label,
      }));
    case 'inputSource':
      return Object.entries(INPUT_SOURCE_VALUES).map(([value, label]) => ({
        value: parseInt(value),
        label,
      }));
    default:
      return [];
  }
}