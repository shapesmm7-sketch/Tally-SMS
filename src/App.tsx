import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Layout from './components/Layout';
import PinScreen from './pages/PinScreen';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Help from './pages/Help';
import TransactionDetail from './pages/TransactionDetail';
import Subscription from './pages/Subscription';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import { InterstitialAdController } from './lib/ads/InterstitialAdController';
import { ThemeProvider } from './context/ThemeContext';
import { AdProvider } from './context/AdContext';
import InterstitialAdModal from './components/ads/InterstitialAdModal';
import LimitModal from './components/LimitModal';
import { useInterstitialAd } from './hooks/useInterstitialAd';
import { useAccessControl } from './hooks/useAccessControl';
import { syncPendingSMS } from './lib/smsDetector';

// Preload ads on startup
InterstitialAdController.preload();

function NativeBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let backButtonHandle: any;

    const setup = async () => {
      if (!Capacitor.isNativePlatform()) return;

      backButtonHandle = await CapacitorApp.addListener('backButton', () => {
        if (location.pathname === '/' || location.pathname === '/dashboard') {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });
    };

    setup();

    return () => {
      if (backButtonHandle) {
        backButtonHandle.remove();
      }
    };
  }, [location.pathname, navigate]);

  return null;
}

function AppContent() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showGlobalLimitModal, setShowGlobalLimitModal] = useState(false);
  const { showInterstitialModal, handleAdClosed } = useInterstitialAd();
  const { getAutoDetectAllowance, recordAutoDetectUsage } = useAccessControl();

  useEffect(() => {
    // Hardware back button for PIN screen (Exit app if locked and back pressed)
    let pinBackHandle: any;
    const setupPinBack = async () => {
      if (!Capacitor.isNativePlatform() || isUnlocked) return;
      pinBackHandle = await CapacitorApp.addListener('backButton', () => {
        CapacitorApp.exitApp();
      });
    };
    setupPinBack();

    const runSync = async () => {
      if (Capacitor.isNativePlatform()) {
        const allowance = getAutoDetectAllowance();
        const { count, limitReached } = await syncPendingSMS(allowance);
        if (count > 0) recordAutoDetectUsage(count);
        if (limitReached) {
          setShowGlobalLimitModal(true);
        }
      }
    };

    // Sync any pending SMS detected in background
    runSync();

    // Listen for app foregrounding to sync again
    let listenerHandle: any;
    
    const setup = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      listenerHandle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          runSync();
        }
      });
    };

    setup();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
      if (pinBackHandle) {
        pinBackHandle.remove();
      }
    };
  }, [isUnlocked, getAutoDetectAllowance, recordAutoDetectUsage]);

  return (
    <>
      <InterstitialAdModal isOpen={showInterstitialModal} onClose={handleAdClosed} />
      {!isUnlocked ? (
        <PinScreen onUnlock={() => setIsUnlocked(true)} />
      ) : (
        <BrowserRouter>
          <NativeBackButtonHandler />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/help" element={<Help />} />
            <Route path="/transaction/:id" element={<TransactionDetail />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
          </Routes>
          {showGlobalLimitModal && (
            <LimitModal onClose={() => setShowGlobalLimitModal(false)} />
          )}
        </BrowserRouter>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AdProvider>
        <AppContent />
      </AdProvider>
    </ThemeProvider>
  );
}
