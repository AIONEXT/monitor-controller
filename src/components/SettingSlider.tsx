import React from 'react';
import { MonitorSetting } from '../monitor-types';
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
  const sliderRef = React.useRef<HTMLInputElement>(null);

  const iconName = ICON_MAP[setting.id] || 'sliders';

  const handleChange = (newValue: number) => {
    const steppedValue = Math.round(newValue / setting.step) * setting.step;
    const clampedValue = Math.max(setting.min, Math.min(setting.max, steppedValue));
    setValue(clampedValue);
    onChange(setting.id, clampedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let newValue = value;
    let handled = true;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newValue = value + setting.step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newValue = value - setting.step;
        break;
      case 'Home':
        e.preventDefault();
        newValue = setting.min;
        break;
      case 'End':
        e.preventDefault();
        newValue = setting.max;
        break;
      case 'PageUp':
        e.preventDefault();
        newValue = value + setting.step * 10;
        break;
      case 'PageDown':
        e.preventDefault();
        newValue = value - setting.step * 10;
        break;
      default:
        handled = false;
    }
    
    if (handled) {
      handleChange(newValue);
    }
  };

  const percentage = setting.max > setting.min 
    ? ((value - setting.min) / (setting.max - setting.min)) * 100 
    : 0;

  return (
    <div className="setting-item">
      <div className="setting-header">
        <div className={`setting-icon setting-icon-${setting.id}`}>
          <Icon name={iconName} size={18} />
        </div>
        <div className="setting-info">
          <label htmlFor={setting.id}>{setting.name}</label>
          <div className="setting-range">{setting.min}{setting.unit} - {setting.max}{setting.unit}</div>
        </div>
        <div className="setting-value" id={setting.id}>
          {value}{setting.unit}
        </div>
      </div>
      <div className="slider-container">
        <input
          ref={sliderRef}
          type="range"
          id={`${setting.id}-slider`}
          min={setting.min}
          max={setting.max}
          step={setting.step}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          className="slider"
          style={{ '--slider-progress': `${percentage}%` } as React.CSSProperties}
          aria-label={setting.name}
          aria-valuemin={setting.min}
          aria-valuemax={setting.max}
          aria-valuenow={value}
          tabIndex={0}
        />
        <div className="slider-track">
          <div 
            className="slider-progress" 
            style={{ width: `${percentage}%` } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
};