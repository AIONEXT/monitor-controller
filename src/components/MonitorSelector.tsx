import React from 'react';
import { Monitor } from '../monitor-types';
import { Icon } from './Icon';

interface MonitorSelectorProps {
  monitors: Monitor[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const MonitorSelector: React.FC<MonitorSelectorProps> = ({ monitors, selectedId, onSelect }) => {
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  if (monitors.length === 0) {
    return (
      <div className="monitor-selector empty">
        <div className="no-monitors">
          <Icon name="monitor" size={32} />
          <p>No monitors detected</p>
          <span className="hint">Ensure DDC/CI is enabled in monitor OSD</span>
        </div>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let newIndex = focusedIndex;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        newIndex = Math.min(focusedIndex + 1, monitors.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newIndex = Math.max(focusedIndex - 1, 0);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = monitors.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(monitors[index].id);
        return;
      default:
        return;
    }
    
    setFocusedIndex(newIndex);
    itemRefs.current[newIndex]?.focus();
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  return (
    <div className="monitor-selector">
      <div className="monitor-list" role="listbox" aria-label="Monitors">
        {monitors.map((monitor, index) => (
          <button
            ref={(el) => { itemRefs.current[index] = el; }}
            key={monitor.id}
            className={`monitor-item ${monitor.id === selectedId ? 'active' : ''} ${index === focusedIndex ? 'focused' : ''}`}
            onClick={() => onSelect(monitor.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            role="option"
            aria-selected={monitor.id === selectedId}
            aria-label={`${monitor.name}${monitor.isPrimary ? ' (Primary)' : ''}`}
            tabIndex={monitor.id === selectedId ? 0 : -1}
          >
            <div className="monitor-info">
              <div className="monitor-name-row">
                <span className="monitor-name">{monitor.name}</span>
                {monitor.isPrimary && <span className="primary-badge">Primary</span>}
              </div>
              <div className="monitor-details">
                {monitor.manufacturer} {monitor.model}
                {monitor.diagonalInches && (
                  <>
                    <span className="separator">•</span>
                    <span>{monitor.diagonalInches}"</span>
                  </>
                )}
              </div>
            </div>
            {monitor.id === selectedId && <Icon name="check" size={16} className="check-icon" />}
          </button>
        ))}
      </div>
    </div>
  );
};