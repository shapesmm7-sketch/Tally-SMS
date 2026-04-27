import { AdManager } from './AdManager';

export class InterstitialAdController {
  private static actionCount = 0;
  private static lastAdTime = Date.now();
  private static readonly MIN_ACTIONS = 3;
  private static readonly MIN_TIME_MS = 30 * 1000; // 30 seconds for testing
  private static isPreloaded = false;

  static preload() {
    if (!AdManager.canShowAds()) return;
    console.log('InterstitialAdController: Preloading ad...');
    // In production: AdMob.prepareInterstitial({ adId: 'ca-app-pub-3940256099942544/1033173712' })
    this.isPreloaded = true;
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

  static onAdShown() {
    console.log('InterstitialAdController: Ad shown. Resetting counters.');
    this.actionCount = 0;
    this.lastAdTime = Date.now();
    this.isPreloaded = false;
    
    // Preload next ad after a delay
    setTimeout(() => this.preload(), 5000);
  }
}
