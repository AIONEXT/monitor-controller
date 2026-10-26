import React from 'react';
import { Monitor, MonitorSetting, MonitorCapabilities, VCP_CODES, COLOR_TEMP_VALUES, GAMMA_VALUES, INPUT_SOURCE_VALUES, POWER_MODE_VALUES, ASPECT_RATIO_VALUES, RESPONSE_TIME_VALUES, OVSCAN_VALUES, DYNAMIC_CONTRAST_VALUES } from '../monitor-types';
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
  'Display': ['brightness', 'contrast', 'sharpness', 'blackLevel', 'whiteLevel'],
  'Color': ['colorTemp', 'gamma', 'hue', 'saturation', 'redGain', 'greenGain', 'blueGain', 'redOffset', 'greenOffset', 'blueOffset', 'colorFormat', 'digitalVibrance'],
  'Comfort': ['blueLight', 'autoBrightness', 'ecoMode', 'flickerFree'],
  'Advanced': ['overscan', 'aspectRatio', 'dynamicContrast', 'responseTime', 'gameMode', 'hdrMode'],
  'Power': ['powerMode', 'powerSave'],
  'Input': ['inputSource', 'autoInput'],
  'Audio': ['volume', 'mute', 'audioInput'],
};

const DISCRETE_SELECT_SETTINGS = ['colorTemp', 'gamma', 'inputSource', 'aspectRatio', 'responseTime', 'overscan', 'dynamicContrast', 'powerMode', 'powerSave', 'autoInput', 'ecoMode', 'flickerFree', 'gameMode', 'hdrMode', 'colorFormat', 'audioInput', 'mute', 'autoBrightness'];

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
    case 'powerMode':
      return Object.entries(POWER_MODE_VALUES).map(([value, label]) => ({
        value: parseInt(value),
        label,
      }));
    case 'aspectRatio':
      return Object.entries(ASPECT_RATIO_VALUES).map(([value, label]) => ({
        value: parseInt(value),
        label,
      }));
    case 'responseTime':
      return Object.entries(RESPONSE_TIME_VALUES).map(([value, label]) => ({
        value: parseInt(value),
        label,
      }));
    case 'overscan':
      return Object.entries(OVSCAN_VALUES).map(([value, label]) => ({
        value: parseInt(value),
        label,
      }));
    case 'dynamicContrast':
      return Object.entries(DYNAMIC_CONTRAST_VALUES).map(([value, label]) => ({
        value: parseInt(value),
        label,
      }));
    default: {
      // Generic toggle/select for discrete settings without a value map
      const vcpInfo = VCP_CODES[settingId];
      if (vcpInfo && vcpInfo.type === 'discrete') {
        const opts: { value: number; label: string }[] = [];
        const onOffIds = ['powerSave', 'autoInput', 'flickerFree', 'gameMode', 'mute', 'autoBrightness'];
        if (onOffIds.includes(settingId)) {
          opts.push({ value: 0, label: 'Off' }, { value: 1, label: 'On' });
        } else if (settingId === 'ecoMode') {
          opts.push({ value: 0, label: 'Off' }, { value: 1, label: 'Low' }, { value: 2, label: 'Medium' }, { value: 3, label: 'High' });
        } else if (settingId === 'hdrMode') {
          opts.push({ value: 0, label: 'Off' }, { value: 1, label: 'On' }, { value: 2, label: 'Auto' });
        } else {
          for (let v = vcpInfo.defaultMin; v <= vcpInfo.defaultMax; v += vcpInfo.defaultStep) {
            opts.push({ value: v, label: String(v) });
          }
        }
        return opts;
      }
      return [];
    }
  }
}

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

                  if (isDiscrete && DISCRETE_SELECT_SETTINGS.includes(setting.id)) {
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
