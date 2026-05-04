import { differenceInDays, isSameDay } from 'date-fns';

export class UsageLimiter {
  static TRIAL_DAYS = 30;
  static DAILY_LIMIT = 10;

  static initializeTrial() {
    if (!localStorage.getItem('momo_trial_start')) {
      localStorage.setItem('momo_trial_start', new Date().toISOString());
      console.log('Trial started');
    }
  }

  static getTrialStartDate(): Date {
    this.initializeTrial();
    return new Date(localStorage.getItem('momo_trial_start')!);
  }

  static isTrialActive(): boolean {
    const start = this.getTrialStartDate();
    const days = differenceInDays(new Date(), start);
    return days <= this.TRIAL_DAYS;
  }

  static getDaysUntilTrialEnds(): number {
    const start = this.getTrialStartDate();
    const days = differenceInDays(new Date(), start);
    return Math.max(0, this.TRIAL_DAYS - days);
  }

  static getDailyUsage(type: 'autodetect' | 'manualscan' = 'autodetect'): number {
    const dateKey = `momo_${type}_date`;
    const usageKey = `momo_${type}_usage`;
    const lastDate = localStorage.getItem(dateKey);
    
    if (!lastDate || !isSameDay(new Date(lastDate), new Date())) {
      // Reset if it's a new day
      localStorage.setItem(usageKey, '0');
      localStorage.setItem(dateKey, new Date().toISOString());
      return 0;
    }
    return parseInt(localStorage.getItem(usageKey) || '0', 10);
  }

  static incrementUsage(type: 'autodetect' | 'manualscan', count: number = 1) {
    const current = this.getDailyUsage(type as any);
    localStorage.setItem(`momo_${type}_usage`, (current + count).toString());
    localStorage.setItem(`momo_${type}_date`, new Date().toISOString());
  }

  static canUseFreeTier(type: 'autodetect' | 'manualscan'): boolean {
    const limit = this.DAILY_LIMIT;
    return this.getDailyUsage(type) < limit;
  }
}
