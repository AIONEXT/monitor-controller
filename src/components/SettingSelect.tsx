import React from 'react';
import type { MonitorSetting } from '../monitor-types';
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
  const triggerId = `setting-${setting.id}-select`;
  const valueId = `setting-${setting.id}-value`;
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    setValue(setting.value);
  }, [setting.value]);

  const handleChange = (newValue: number, close = true) => {
    setValue(newValue);
    onChange(setting.id, newValue);
    if (close) {
      setIsOpen(false);
      setHighlightedIndex(-1);
      triggerRef.current?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(options.findIndex((option) => option.value === value));
      }
      return;
    }

    const currentIndex = highlightedIndex >= 0 ? highlightedIndex : options.findIndex((option) => option.value === value);
    let nextIndex = currentIndex;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = Math.min(currentIndex + 1, options.length - 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = Math.max(currentIndex - 1, 0);
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = options.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentIndex >= 0 && currentIndex < options.length) handleChange(options[currentIndex].value);
        return;
      case 'Escape':
        event.preventDefault();
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
    setHighlightedIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="setting-item">
      <div className="setting-header">
        <div className={`setting-icon setting-icon-${setting.id}`} aria-hidden="true">
          <Icon name={ICON_MAP[setting.id] || 'sliders'} size={18} />
        </div>
        <div className="setting-info">
          <label htmlFor={triggerId}>{setting.name}</label>
          <div className="setting-range">{options.length} options</div>
        </div>
        <output className="setting-value" id={valueId} htmlFor={triggerId}>
          {selectedOption?.label ?? value}
        </output>
      </div>
      <div className="select-container" onKeyDown={handleKeyDown}>
        <button
          ref={triggerRef}
          type="button"
          id={triggerId}
          name={triggerId}
          className={`select-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen((open) => !open)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`${setting.name}: ${selectedOption?.label || 'Select'}`}
          aria-controls={isOpen ? `${triggerId}-options` : undefined}
        >
          <span className="select-value">{selectedOption?.label || 'Select'}</span>
          <Icon name="chevronDown" size={16} className={isOpen ? 'rotated' : ''} />
        </button>
        {isOpen && (
          <div ref={dropdownRef} id={`${triggerId}-options`} className="select-dropdown" role="listbox" aria-label={`${setting.name} options`}>
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element; }}
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
