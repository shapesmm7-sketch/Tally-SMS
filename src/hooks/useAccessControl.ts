import { useState, useEffect, useCallback } from 'react';
import { UsageLimiter } from '../lib/UsageLimiter';
import { BillingManager } from '../lib/BillingManager';

export function useAccessControl() {
  const [isTrial, setIsTrial] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);

  const refresh = useCallback(() => {
    UsageLimiter.initializeTrial();
    setIsTrial(UsageLimiter.isTrialActive());
    setDaysLeft(UsageLimiter.getDaysUntilTrialEnds());
    setIsPremium(BillingManager.hasActiveSubscription() || BillingManager.hasActiveDailyPass());
    setDailyUsage(UsageLimiter.getDailyUsage());
  }, []);

  useEffect(() => {
    refresh();
    
    // Set up an interval to refresh access control state periodically (e.g., when daily pass expires)
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const canProcessSms = () => {
    if (BillingManager.hasActiveSubscription()) return true;
    if (BillingManager.hasActiveDailyPass()) return true;
    if (UsageLimiter.isTrialActive()) return true;
    if (UsageLimiter.canUseFreeTier()) return true;
    return false;
  };

  const recordSmsUsage = (count: number = 1) => {
    // Only increment usage if they are relying on the free tier
    if (!BillingManager.hasActiveSubscription() && 
        !BillingManager.hasActiveDailyPass() && 
        !UsageLimiter.isTrialActive()) {
      UsageLimiter.incrementUsage(count);
      refresh();
    }
  };

  return {
    isTrial,
    daysLeft,
    isPremium,
    dailyUsage,
    dailyLimit: UsageLimiter.DAILY_LIMIT,
    canProcessSms,
    recordSmsUsage,
    refresh
  };
}
