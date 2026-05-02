import { AdManager } from './AdManager';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';

export class InterstitialAdController {
  private static actionCount = 0;
  private static lastAdTime = Date.now();
  private static readonly MIN_ACTIONS = 7;
  private static readonly MIN_TIME_MS = 60 * 1000; // 60 seconds (adjusted to be more reasonable)
  private static isPreloaded = false;

  static async preload() {
    if (!AdManager.canShowAds()) return;
    
    if (Capacitor.isNativePlatform()) {
      try {
        await AdMob.prepareInterstitial({
          adId: 'ca-app-pub-3940256099942544/1033173712',
        });
        this.isPreloaded = true;
      } catch (err) {
        console.error('Failed to preload native interstitial', err);
      }
    } else {
      console.log('InterstitialAdController: Preloading ad (web)...');
      this.isPreloaded = true;
    }
  }

  static recordAction(): boolean {
    if (!AdManager.canShowAds()) return false;

    this.actionCount++;
    const now = Date.now();
    
    console.log(`InterstitialAdController: Action recorded. Count: ${this.actionCount}`);

    if (this.actionCount >= this.MIN_ACTIONS && (now - this.lastAdTime) >= this.MIN_TIME_MS) {
      return true; // Should show ad
    }
    return false;
  }

  static async showAd(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await AdMob.showInterstitial();
      } catch (err) {
        console.error('Failed to show native interstitial', err);
      }
    }
  }

  static onAdShown() {
    console.log('InterstitialAdController: Ad shown. Resetting counters.');
    this.actionCount = 0;
    this.lastAdTime = Date.now();
    this.isPreloaded = false;
    
    // Preload next ad after a delay
    setTimeout(() => this.preload(), 5000);
  }
}
