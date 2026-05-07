import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { BillingManager } from '../BillingManager';

export class AdManager {
  static canShowAds(): boolean {
    // Premium users (active subscription or daily pass) get an ad-free experience
    if (BillingManager.hasActiveSubscription() || BillingManager.hasActiveDailyPass()) {
      return false;
    }
    return true;
  }

  static async initialize() {
    if (!this.canShowAds()) {
      console.log('AdManager: Premium user, skipping AdMob initialization');
      return;
    }
    
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('AdManager: Initializing Google AdMob SDK...');
        await AdMob.initialize();
      } catch (e) {
        console.error('AdManager: AdMob initialization failed', e);
      }
    } else {
      console.log('AdManager: Web environment, skipping native AdMob initialization');
    }
  }
}
