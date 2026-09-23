import React from 'react';
import { Icon } from './Icon';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

const ICON_MAP = {
  success: 'check',
  error: 'alert',
  info: 'info',
};

const COLOR_MAP = {
  success: 'var(--accent)',
  error: 'var(--danger)',
  info: 'var(--info)',
};

export const Toast: React.FC<ToastProps> = ({ message, type }) => {
  return (
    <div 
      className={`toast toast-${type}`}
      style={{ '--toast-color': COLOR_MAP[type] } as React.CSSProperties}
      role="alert"
      aria-live="polite"
    >
      <Icon name={ICON_MAP[type]} size={20} />
      <span>{message}</span>
    </div>
  );
};

export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="toast-container">
      {children}
    </div>
  );
};