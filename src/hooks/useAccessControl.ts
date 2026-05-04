import { useState, useEffect, useCallback } from 'react';
import { UsageLimiter } from '../lib/UsageLimiter';
import { BillingManager } from '../lib/BillingManager';

export function useAccessControl() {
  const [isTrial, setIsTrial] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [autoDetectUsage, setAutoDetectUsage] = useState(0);
  const [manualScanUsage, setManualScanUsage] = useState(0);

  const refresh = useCallback(() => {
    UsageLimiter.initializeTrial();
    setIsTrial(UsageLimiter.isTrialActive());
    setDaysLeft(UsageLimiter.getDaysUntilTrialEnds());
    setIsPremium(BillingManager.hasActiveSubscription() || BillingManager.hasActiveDailyPass());
    setAutoDetectUsage(UsageLimiter.getDailyUsage('autodetect'));
    setManualScanUsage(UsageLimiter.getDailyUsage('manualscan'));
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

  return {
    isTrial,
    daysLeft,
    isPremium,
    autoDetectUsage,
    manualScanUsage,
    dailyLimit: UsageLimiter.DAILY_LIMIT,
    canProcessAutoDetectSms,
    getAutoDetectAllowance,
    canProcessManualScan,
    getManualScanAllowance,
    recordAutoDetectUsage,
    recordManualScanUsage,
    needsAdForPdf: !isPremium && !isTrial,
    refresh
  };
}
