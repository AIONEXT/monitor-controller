import React from 'react';
import { Icon } from './Icon';

interface HeaderProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMinimize, onMaximize, onClose }) => {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <Icon name="monitor" size={24} />
          <span>Monitor Controller</span>
        </div>
        <span className="version-badge">v1.0.0</span>
      </div>
      <div className="header-right">
        <div className="header-spacer" />
        <div className="window-controls">
          <button className="win-btn minimize" onClick={onMinimize} aria-label="Minimize">
            <Icon name="minus" size={12} />
          </button>
          <button className="win-btn maximize" onClick={onMaximize} aria-label="Maximize">
            <Icon name="square" size={12} />
          </button>
          <button className="win-btn close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>
    </header>
  );
};