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
    let failListener: any;
    let failShowListener: any;
    
    if (Capacitor.isNativePlatform()) {
      // Event: Dismissed (User closed the ad)
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        console.log('Ad dismissed, executing pending action');
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

      // Event: FailedToLoad or FailedToShow
      const handleAdFailure = () => {
        console.log('Ad failed to load or show, executing pending action');
        setPendingAction((currentAction) => {
          if (currentAction) {
            currentAction();
          }
          return null;
        });
        clearSafetyTimeout();
        isInProgress.current = false;
      };

      AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, handleAdFailure).then(listener => {
        failListener = listener;
      });

      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, handleAdFailure).then(listener => {
        failShowListener = listener;
      });
    }

    return () => {
      if (adListener) adListener.remove();
      if (failListener) failListener.remove();
      if (failShowListener) failShowListener.remove();
    };
  }, []);

  const isInProgress = React.useRef(false);
  const safetyTimeoutRef = React.useRef<any>(null);

  const clearSafetyTimeout = () => {
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  };

  const triggerAction = useCallback(async (action: () => void) => {
    if (isInProgress.current) {
      console.log('Ad show already in progress, skipping ad logic and executing NEW action immediately');
      // Clear previous pending action so we don't have two navigations
      setPendingAction(null);
      clearSafetyTimeout();
      isInProgress.current = false;
      action();
      return;
    }

    const shouldShowAd = InterstitialAdController.recordAction();
    
    if (shouldShowAd) {
      isInProgress.current = true;
      if (Capacitor.isNativePlatform()) {
        try {
          setPendingAction(() => () => {
            isInProgress.current = false;
            action();
          });
          
          // Safety timeout for native ad: if not dismissed in 10s, just run the action
          // 30s is too long and frustrates users
          clearSafetyTimeout();
          safetyTimeoutRef.current = setTimeout(() => {
            if (isInProgress.current) {
              console.log('Ad safety timeout triggered (native)');
              setPendingAction((currentAction) => {
                if (currentAction) {
                  currentAction();
                }
                return null;
              });
              isInProgress.current = false;
            }
          }, 10000); 

          await InterstitialAdController.showAd();
        } catch (error) {
          console.error('Error showing ad:', error);
          clearSafetyTimeout();
          isInProgress.current = false;
          setPendingAction(null);
          action();
        }
      } else {
        setPendingAction(() => () => {
          isInProgress.current = false;
          action();
        });
        setShowModal(true);
      }
    } else {
      action();
    }
  }, []);

  const forceAd = useCallback(async (action: () => void) => {
    if (isInProgress.current) {
      action();
      return;
    }

    isInProgress.current = true;
    if (Capacitor.isNativePlatform()) {
       try {
         setPendingAction(() => () => {
           isInProgress.current = false;
           action();
         });
         await InterstitialAdController.showAd();
       } catch (error) {
         isInProgress.current = false;
         action();
       }
    } else {
      setPendingAction(() => () => {
        isInProgress.current = false;
        action();
      });
      setShowModal(true);
    }
  }, []);

  const handleAdClosed = useCallback(() => {
    console.log('Ad closed manually (modal), executing pending action');
    setShowModal(false);
    clearSafetyTimeout();
    InterstitialAdController.onAdShown();
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    isInProgress.current = false;
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
