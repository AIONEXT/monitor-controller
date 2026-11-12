import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import './calibration.css';
import './universal-refinement.css';
import './branding.css';

const container = document.getElementById('root');
if (container) createRoot(container).render(<App />);
