import { BillingManager } from '../BillingManager';

export class AdManager {
  static canShowAds(): boolean {
    // Premium users (active subscription or daily pass) get an ad-free experience
    if (BillingManager.hasActiveSubscription() || BillingManager.hasActiveDailyPass()) {
      return false;
    }
    return true;
  }

  static initialize() {
    if (!this.canShowAds()) {
      console.log('AdManager: Premium user, skipping AdMob initialization');
      return;
    }
    console.log('AdManager: Initializing Google AdMob SDK...');
    // In a native Capacitor app:
    // AdMob.initialize({ requestTrackingAuthorization: true });
  }
}
