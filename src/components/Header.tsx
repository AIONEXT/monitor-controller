import React from 'react';
import { Icon } from './Icon';

interface HeaderProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  version?: string;
}

export const Header: React.FC<HeaderProps> = ({ onMinimize, onMaximize, onClose, version = '1.0.0' }) => (
  <header className="header">
    <div className="header-left">
      <div className="logo" aria-label="AIONEXT Monitor Controller">
        <Icon name="monitor" size={24} />
        <span className="brand-wordmark"><strong>AIONEXT</strong><span>Monitor Controller</span></span>
      </div>
      <span className="version-badge">v{version}</span>
    </div>
    <div className="header-right">
      <div className="header-spacer" />
      <div className="window-controls">
        <button className="win-btn minimize" onClick={onMinimize} aria-label="Minimize"><Icon name="minus" size={12} /></button>
        <button className="win-btn maximize" onClick={onMaximize} aria-label="Maximize"><Icon name="square" size={12} /></button>
        <button className="win-btn close" onClick={onClose} aria-label="Close"><Icon name="x" size={12} /></button>
      </div>
    </div>
  </header>
);
