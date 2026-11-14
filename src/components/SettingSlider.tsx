import React from 'react';
import type { MonitorSetting } from '../monitor-types';
import { Icon, type IconName } from './Icon';

interface SettingSliderProps {
  setting: MonitorSetting;
  onChange: (settingId: string, value: number) => void;
}

const ICON_MAP: Record<string, IconName> = {
  brightness: 'sun',
  contrast: 'contrast',
  sharpness: 'focus',
  colorTemp: 'thermometer',
  gamma: 'chart',
  hue: 'palette',
  saturation: 'droplet',
  blueLight: 'shield',
  autoBrightness: 'sun',
  powerMode: 'zap',
};

export const SettingSlider: React.FC<SettingSliderProps> = ({ setting, onChange }) => {
  const [value, setValue] = React.useState(setting.value);
  const sliderId = `setting-${setting.id}-slider`;
  const valueId = `setting-${setting.id}-value`;
  const iconName = ICON_MAP[setting.id] || 'sliders';

  React.useEffect(() => {
    setValue(setting.value);
  }, [setting.value]);

  const handleChange = (newValue: number) => {
    const step = Number.isFinite(setting.step) && setting.step > 0 ? setting.step : 1;
    const steppedValue = setting.min + Math.round((newValue - setting.min) / step) * step;
    const clampedValue = Math.max(setting.min, Math.min(setting.max, steppedValue));
    setValue(clampedValue);
    onChange(setting.id, clampedValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    let nextValue = value;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        nextValue = value + setting.step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        nextValue = value - setting.step;
        break;
      case 'Home':
        event.preventDefault();
        nextValue = setting.min;
        break;
      case 'End':
        event.preventDefault();
        nextValue = setting.max;
        break;
      case 'PageUp':
        event.preventDefault();
        nextValue = value + setting.step * 10;
        break;
      case 'PageDown':
        event.preventDefault();
        nextValue = value - setting.step * 10;
        break;
      default:
        return;
    }
    handleChange(nextValue);
  };

  const percentage = setting.max > setting.min
    ? ((value - setting.min) / (setting.max - setting.min)) * 100
    : 0;

  return (
    <div className="setting-item">
      <div className="setting-header">
        <div className={`setting-icon setting-icon-${setting.id}`} aria-hidden="true">
          <Icon name={iconName} size={18} />
        </div>
        <div className="setting-info">
          <label htmlFor={sliderId}>{setting.name}</label>
          <div className="setting-range" id={`${sliderId}-range`}>
            {setting.min}{setting.unit} - {setting.max}{setting.unit}
          </div>
        </div>
        <output className="setting-value" id={valueId} htmlFor={sliderId}>
          {value}{setting.unit}
        </output>
      </div>
      <div className="slider-container">
        <input
          type="range"
          id={sliderId}
          name={sliderId}
          min={setting.min}
          max={setting.max}
          step={Number.isFinite(setting.step) && setting.step > 0 ? setting.step : 1}
          value={value}
          onChange={(event) => handleChange(Number(event.target.value))}
          onKeyDown={handleKeyDown}
          className="slider"
          style={{ '--slider-progress': `${percentage}%` } as React.CSSProperties}
          aria-describedby={`${sliderId}-range ${valueId}`}
          aria-valuetext={`${value}${setting.unit}`}
        />
        <div className="slider-track" aria-hidden="true">
          <div className="slider-progress" style={{ width: `${percentage}%` } as React.CSSProperties} />
        </div>
      </div>
    </div>
  );
};
