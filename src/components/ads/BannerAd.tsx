import React, { useEffect, useState } from 'react';
import { useAccessControl } from '../../hooks/useAccessControl';
import { BannerAdController } from '../../lib/ads/BannerAdController';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

export default function BannerAd() {
  const { isPremium } = useAccessControl();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isPremium) return;

    if (Capacitor.isNativePlatform()) {
      const showNativeBanner = async () => {
        try {
          await AdMob.showBanner({
            adId: BannerAdController.getAdUnitId(true),
            adSize: BannerAdSize.BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 64, // Push up 64 units to sit above the 64px bottom nav
            isTesting: false,
          });
          setIsLoaded(true);
        } catch (e) {
          console.error("Failed to show banner", e);
        }
      };

      showNativeBanner();

      return () => {
        // Only hide if we are navigating away from a screen that has banners
        // For a more complex app we'd track multiple banner unmounts, but since 
        // we use a layout, we can hide it here
        AdMob.hideBanner().catch(console.error);
        AdMob.removeBanner().catch(console.error);
      };
    } else {
      // Simulate AdMob SDK loading the banner
      console.log(`BannerAd: Loading ad unit ${BannerAdController.getAdUnitId()}`);
      setIsLoaded(true);
    }
  }, [isPremium]);

  if (isPremium) return null;

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center shrink-0 z-40 transition-colors" style={{ height: Capacitor.isNativePlatform() ? '60px' : 'auto', padding: Capacitor.isNativePlatform() ? '0' : '8px 0' }}>
      {!Capacitor.isNativePlatform() && (
        <>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Advertisement</span>
          {isLoaded ? (
            <div className="w-[320px] h-[50px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center shadow-sm transition-colors">
              <span className="text-gray-500 dark:text-gray-400 font-medium text-sm">Google AdMob Banner</span>
            </div>
          ) : (
            <div className="w-[320px] h-[50px] bg-gray-200 dark:bg-gray-800 animate-pulse flex items-center justify-center transition-colors">
              <span className="text-gray-400 dark:text-gray-500 text-sm">Loading Ad...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
