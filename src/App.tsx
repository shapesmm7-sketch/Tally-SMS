import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PinScreen from './pages/PinScreen';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import TransactionDetail from './pages/TransactionDetail';
import Subscription from './pages/Subscription';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import { InterstitialAdController } from './lib/ads/InterstitialAdController';
import { ThemeProvider } from './context/ThemeContext';
import { AdProvider } from './context/AdContext';
import InterstitialAdModal from './components/ads/InterstitialAdModal';
import { useInterstitialAd } from './hooks/useInterstitialAd';

// Preload ads on startup
InterstitialAdController.preload();

function AppContent() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { showInterstitialModal, handleAdClosed } = useInterstitialAd();

  return (
    <>
      <InterstitialAdModal isOpen={showInterstitialModal} onClose={handleAdClosed} />
      {!isUnlocked ? (
        <PinScreen onUnlock={() => setIsUnlocked(true)} />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/transaction/:id" element={<TransactionDetail />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsAndConditions />} />
          </Routes>
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
