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
  AdMob.initialize().catch(console.error);
}

// Record the first time the app is launched so auto-sync doesn't pull in older history automatically
if (!localStorage.getItem('momo_auto_sync_start_time')) {
  localStorage.setItem('momo_auto_sync_start_time', Date.now().toString());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
