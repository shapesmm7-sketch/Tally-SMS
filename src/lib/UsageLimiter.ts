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

  static getDailyUsage(): number {
    const lastDate = localStorage.getItem('momo_last_usage_date');
    if (!lastDate || !isSameDay(new Date(lastDate), new Date())) {
      // Reset if it's a new day
      localStorage.setItem('momo_daily_usage', '0');
      return 0;
    }
    return parseInt(localStorage.getItem('momo_daily_usage') || '0', 10);
  }

  static incrementUsage(count: number = 1) {
    const current = this.getDailyUsage();
    localStorage.setItem('momo_daily_usage', (current + count).toString());
    localStorage.setItem('momo_last_usage_date', new Date().toISOString());
  }

  static canUseFreeTier(): boolean {
    return this.getDailyUsage() < this.DAILY_LIMIT;
  }
}
