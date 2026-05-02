import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/i18n';
import { BillingManager } from './lib/BillingManager';
import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Initialize native billing if on device
BillingManager.initialize();

// Initialize AdMob
if (Capacitor.isNativePlatform()) {
  AdMob.initialize({
    testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // optional
    initializeForTesting: true,
  }).catch(console.error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
