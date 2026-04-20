import React, { createContext, useContext, useState, useCallback } from 'react';
import { InterstitialAdController } from '../lib/ads/InterstitialAdController';

interface AdContextType {
  showInterstitialModal: boolean;
  triggerAction: (action: () => void) => void;
  forceAd: (action: () => void) => void;
  handleAdClosed: () => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export function AdProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const triggerAction = useCallback((action: () => void) => {
    const shouldShowAd = InterstitialAdController.recordAction();
    
    if (shouldShowAd) {
      setPendingAction(() => action);
      setShowModal(true);
    } else {
      action();
    }
  }, []);

  const forceAd = useCallback((action: () => void) => {
    setPendingAction(() => action);
    setShowModal(true);
  }, []);

  const handleAdClosed = useCallback(() => {
    setShowModal(false);
    InterstitialAdController.onAdShown();
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  return (
    <AdContext.Provider value={{ showInterstitialModal: showModal, triggerAction, forceAd, handleAdClosed }}>
      {children}
    </AdContext.Provider>
  );
}

export function useAdContext() {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAdContext must be used within an AdProvider');
  }
  return context;
}
