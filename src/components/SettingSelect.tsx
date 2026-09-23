import React from 'react';
import { MonitorSetting } from '../monitor-types';
import { Icon, type IconName } from './Icon';

interface SettingSelectProps {
  setting: MonitorSetting;
  options: { value: number; label: string }[];
  onChange: (settingId: string, value: number) => void;
}

const ICON_MAP: Record<string, IconName> = {
  colorTemp: 'thermometer',
  gamma: 'chart',
  inputSource: 'monitor',
};

export const SettingSelect: React.FC<SettingSelectProps> = ({ setting, options, onChange }) => {
  const [value, setValue] = React.useState(setting.value);
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const iconName = ICON_MAP[setting.id] || 'sliders';

  const handleChange = (newValue: number, close = true) => {
    setValue(newValue);
    onChange(setting.id, newValue);
    if (close) {
      setIsOpen(false);
      setHighlightedIndex(-1);
      triggerRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(options.findIndex(o => o.value === value));
      }
      return;
    }

    const currentIndex = highlightedIndex >= 0 ? highlightedIndex : options.findIndex(o => o.value === value);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        newIndex = Math.min(currentIndex + 1, options.length - 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = options.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentIndex >= 0) {
          handleChange(options[currentIndex].value);
        }
        return;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        triggerRef.current?.focus();
        return;
      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      default:
        return;
    }

    setHighlightedIndex(newIndex);
    optionRefs.current[newIndex]?.focus();
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  React.useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="setting-item">
      <div className="setting-header">
        <div className={`setting-icon setting-icon-${setting.id}`}>
          <Icon name={iconName} size={18} />
        </div>
        <div className="setting-info">
          <label htmlFor={setting.id}>{setting.name}</label>
          <div className="setting-range">{options.length} options</div>
        </div>
        <div className="setting-value" id={setting.id}>
          {selectedOption?.label || value}
        </div>
      </div>
      <div className="select-container" onKeyDown={handleKeyDown}>
        <button
          ref={triggerRef}
          type="button"
          id={`${setting.id}-select-trigger`}
          className={`select-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`${setting.name}: ${selectedOption?.label || 'Select'}`}
          tabIndex={0}
        >
          <span className="select-value">
            {selectedOption?.label || 'Select'}
          </span>
          <Icon name="chevronDown" size={16} className={isOpen ? 'rotated' : ''} />
        </button>
        
        {isOpen && (
          <div
            ref={dropdownRef}
            className="select-dropdown"
            role="listbox"
            aria-label={`${setting.name} options`}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(el) => { optionRefs.current[index] = el; }}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`select-option ${option.value === value ? 'selected' : ''} ${index === highlightedIndex ? 'highlighted' : ''}`}
                onClick={() => handleChange(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                tabIndex={-1}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};