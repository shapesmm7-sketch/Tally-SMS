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

  const isInProgress = React.useRef(false);

  const triggerAction = useCallback(async (action: () => void) => {
    if (isInProgress.current) {
      console.log('Ad show already in progress, skipping ad logic and executing action');
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
          
          // Safety timeout for native ad: if not dismissed in 30s, just run the action
          const safetyTimeout = setTimeout(() => {
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
          }, 30000);

          await InterstitialAdController.showAd();
        } catch (error) {
          console.error('Error showing ad:', error);
          isInProgress.current = false;
          action();
        }
      } else {
        setPendingAction(() => () => {
          isInProgress.current = false;
          action();
        });
        setShowModal(true);
        
        // Safety timeout for web modal
        setTimeout(() => {
           // We don't force close the modal here but ensure we don't block forever if somehow it breaks
        }, 30000);
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
    setShowModal(false);
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
