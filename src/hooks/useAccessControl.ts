import { useState, useEffect, useCallback } from 'react';
import { UsageLimiter } from '../lib/UsageLimiter';
import { BillingManager } from '../lib/BillingManager';

export function useAccessControl() {
  const [isTrial, setIsTrial] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [autoDetectUsage, setAutoDetectUsage] = useState(0);
  const [manualScanUsage, setManualScanUsage] = useState(0);
  const [liveScanUsage, setLiveScanUsage] = useState(0);

  const refresh = useCallback(() => {
    UsageLimiter.initializeTrial();
    setIsTrial(UsageLimiter.isTrialActive());
    setDaysLeft(UsageLimiter.getDaysUntilTrialEnds());
    setIsPremium(BillingManager.hasActiveSubscription() || BillingManager.hasActiveDailyPass());
    setAutoDetectUsage(UsageLimiter.getDailyUsage('autodetect'));
    setManualScanUsage(UsageLimiter.getDailyUsage('manualscan'));
    setLiveScanUsage(UsageLimiter.getDailyUsage('livescan'));
  }, []);

  useEffect(() => {
    refresh();
    
    // Set up an interval to refresh access control state periodically (e.g., when daily pass expires)
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const canProcessAutoDetectSms = () => {
    if (isPremium || isTrial) return true;
    return UsageLimiter.canUseFreeTier('autodetect');
  };

  const getAutoDetectAllowance = () => {
    if (isPremium || isTrial) return Infinity;
    return Math.max(0, UsageLimiter.DAILY_LIMIT - autoDetectUsage);
  };

  const canProcessManualScan = () => {
    if (isPremium || isTrial) return true;
    return UsageLimiter.canUseFreeTier('manualscan');
  };

  const getManualScanAllowance = () => {
    if (isPremium || isTrial) return Infinity;
    return Math.max(0, UsageLimiter.DAILY_LIMIT - manualScanUsage);
  };

  const canProcessLiveScan = () => {
    if (isPremium || isTrial) return true;
    return UsageLimiter.canUseFreeTier('livescan');
  };

  const getLiveScanAllowance = () => {
    if (isPremium || isTrial) return Infinity;
    return Math.max(0, UsageLimiter.LIVESCAN_DAILY_LIMIT - liveScanUsage);
  };

  const recordAutoDetectUsage = (count: number = 1) => {
    if (!isPremium && !isTrial) {
      UsageLimiter.incrementUsage('autodetect', count);
      refresh();
    }
  };

  const recordManualScanUsage = (count: number = 1) => {
    if (!isPremium && !isTrial) {
      UsageLimiter.incrementUsage('manualscan', count);
      refresh();
    }
  };

  const recordLiveScanUsage = (count: number = 1) => {
    if (!isPremium && !isTrial) {
      UsageLimiter.incrementUsage('livescan', count);
      refresh();
    }
  };

  return {
    isTrial,
    daysLeft,
    isPremium,
    autoDetectUsage,
    manualScanUsage,
    liveScanUsage,
    dailyLimit: UsageLimiter.DAILY_LIMIT,
    liveScanLimit: UsageLimiter.LIVESCAN_DAILY_LIMIT,
    canProcessAutoDetectSms,
    getAutoDetectAllowance,
    canProcessManualScan,
    getManualScanAllowance,
    canProcessLiveScan,
    getLiveScanAllowance,
    recordAutoDetectUsage,
    recordManualScanUsage,
    recordLiveScanUsage,
    needsAdForPdf: !isPremium && !isTrial,
    refresh
  };
}
