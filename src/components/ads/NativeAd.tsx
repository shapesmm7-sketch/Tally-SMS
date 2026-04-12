import React, { useEffect, useState } from 'react';
import { useAccessControl } from '../../hooks/useAccessControl';
import { NativeAdController } from '../../lib/ads/NativeAdController';

export default function NativeAd() {
  const { isPremium } = useAccessControl();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isPremium) {
      console.log(`NativeAd: Loading ad unit ${NativeAdController.getAdUnitId()}`);
      setIsLoaded(true);
    }
  }, [isPremium]);

  if (isPremium) return null;

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 my-4 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Ad</span>
      </div>
      {isLoaded ? (
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-xl shrink-0 flex items-center justify-center transition-colors">
            <span className="text-gray-400 dark:text-gray-500 text-xs">Icon</span>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">MoMo Tracker Premium</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Unlock unlimited SMS auto-detection and remove all ads today!</p>
            <button className="bg-blue-600 dark:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
              Learn More
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-pulse flex items-start space-x-4">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-xl shrink-0"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
          </div>
        </div>
      )}
    </div>
  );
}
