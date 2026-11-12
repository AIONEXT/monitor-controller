import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import './calibration.css';
import './universal-refinement.css';
import './branding.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Renderer root element #root is missing from index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
