import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { InterstitialAdController } from '../lib/ads/InterstitialAdController';
import { Capacitor } from '@capacitor/core';
import { AdMob, InterstitialAdPluginEvents } from '@capacitor-community/admob';

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

  useEffect(() => {
    let adListener: any;
    if (Capacitor.isNativePlatform()) {
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        setPendingAction((currentAction) => {
          if (currentAction) {
            currentAction();
          }
          InterstitialAdController.onAdShown();
          return null;
        });
      }).then(listener => {
        adListener = listener;
      });
    }

    return () => {
      if (adListener) {
        adListener.remove();
      }
    };
  }, []);

  const triggerAction = useCallback(async (action: () => void) => {
    const shouldShowAd = InterstitialAdController.recordAction();
    
    if (shouldShowAd) {
      if (Capacitor.isNativePlatform()) {
        setPendingAction(() => action);
        await InterstitialAdController.showAd();
      } else {
        setPendingAction(() => action);
        setShowModal(true);
      }
    } else {
      action();
    }
  }, []);

  const forceAd = useCallback(async (action: () => void) => {
    if (Capacitor.isNativePlatform()) {
       setPendingAction(() => action);
       await InterstitialAdController.showAd();
    } else {
      setPendingAction(() => action);
      setShowModal(true);
    }
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
