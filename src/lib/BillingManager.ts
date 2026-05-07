import { Capacitor } from '@capacitor/core';

// Ensure you create these exact Product IDs in Google Play Console
const PRODUCT_IDS = {
  daily: 'momosms_daily_pass',
  weekly: 'momosms_weekly_sub',
  monthly: 'momosms_monthly_sub',
  yearly: 'momosms_yearly_sub'
};

export class BillingManager {
  private static isInitialized = false;
  private static activePurchaseResolver: ((result: boolean) => void) | null = null;

  static async initialize() {
    if (this.isInitialized || !Capacitor.isNativePlatform()) return;
    
    try {
      const { store, ProductType, Platform } = window.CdvPurchase || {};
      if (!store) return;

      store.register([{
        type: ProductType.CONSUMABLE,
        id: PRODUCT_IDS.daily,
        platform: Platform.GOOGLE_PLAY,
      }, {
        type: ProductType.PAID_SUBSCRIPTION,
        id: PRODUCT_IDS.weekly,
        platform: Platform.GOOGLE_PLAY,
      }, {
        type: ProductType.PAID_SUBSCRIPTION,
        id: PRODUCT_IDS.monthly,
        platform: Platform.GOOGLE_PLAY,
      }, {
        type: ProductType.PAID_SUBSCRIPTION,
        id: PRODUCT_IDS.yearly,
        platform: Platform.GOOGLE_PLAY,
      }]);

      store.when().approved((p: any) => {
        p.verify();
      });

      store.when().verified((p: any) => {
        p.finish();
      });

      store.when().finished((p: any) => {
        this.updateLocalStateFromPurchase(p);
        if (this.activePurchaseResolver) {
          this.activePurchaseResolver(true);
          this.activePurchaseResolver = null;
        }
      });

      store.when().unverified((p: any) => {
        if (this.activePurchaseResolver) {
          this.activePurchaseResolver(false);
          this.activePurchaseResolver = null;
        }
      });

      store.error((err: any) => {
        console.error('Store error:', err);
        if (this.activePurchaseResolver) {
          this.activePurchaseResolver(false);
          this.activePurchaseResolver = null;
        }
      });

      await store.initialize([Platform.GOOGLE_PLAY]);
      this.isInitialized = true;
      this.syncStateWithStore();
    } catch (e) {
      console.error('Failed to initialize store', e);
    }
  }

  static syncStateWithStore() {
    const { store } = window.CdvPurchase || {};
    if (!store) return;

    let hasActiveSub = false;
    let hasDailyPassActive = this.hasActiveDailyPass();

    ['weekly', 'monthly', 'yearly'].forEach(plan => {
      const p = store.get((PRODUCT_IDS as any)[plan]);
      if (p && p.owned) {
        hasActiveSub = true;
        localStorage.setItem('momo_sub_plan', plan);
      }
    });

    if (hasActiveSub) {
      localStorage.setItem('momo_sub_active', 'true');
    } else {
      localStorage.removeItem('momo_sub_active');
    }
  }

  static updateLocalStateFromPurchase(product: any) {
    if (product.id === PRODUCT_IDS.daily) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);
      localStorage.setItem('momo_daily_pass_expiry', expiry.toISOString());
    } else {
      localStorage.setItem('momo_sub_active', 'true');
      const plan = Object.keys(PRODUCT_IDS).find(k => (PRODUCT_IDS as any)[k] === product.id);
      if (plan) localStorage.setItem('momo_sub_plan', plan);
    }
  }

  static hasActiveSubscription(): boolean {
    return localStorage.getItem('momo_sub_active') === 'true';
  }

  static hasActiveDailyPass(): boolean {
    const expiry = localStorage.getItem('momo_daily_pass_expiry');
    if (!expiry) return false;
    return new Date(expiry) > new Date();
  }

  static getLocalizedPrices(): Record<string, string> {
    const defaultPrices = {
      daily: '$0.25',
      weekly: '$1.1',
      monthly: '$3.33',
      yearly: '$29.9'
    };

    if (!Capacitor.isNativePlatform()) {
      return defaultPrices;
    }

    try {
      const { store } = window.CdvPurchase || {};
      if (!store) return defaultPrices;

      const prices: Record<string, string> = { ...defaultPrices };

      Object.entries(PRODUCT_IDS).forEach(([plan, id]) => {
        const product = store.get(id);
        if (product) {
           const offers = product.offers || [];
           if (offers.length > 0 && offers[0].pricingPhases && offers[0].pricingPhases.length > 0) {
              const priceString = offers[0].pricingPhases[0].price;
              if (priceString) prices[plan] = priceString;
           } else if (product.pricing && product.pricing.price) {
              // Fallback for some legacy setups
              prices[plan] = product.pricing.price;
           }
        }
      });

      return prices;
    } catch (e) {
      console.error('Failed to get localized prices', e);
      return defaultPrices;
    }
  }

  static async purchaseDailyPass(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return this.simulatePurchase('daily');
    }

    try {
      const { store } = window.CdvPurchase || {};
      if (!store) throw new Error('Store not available');

      const product = store.get(PRODUCT_IDS.daily);
      if (!product) throw new Error('Product not loaded');

      if (product.owned) {
        this.updateLocalStateFromPurchase(product);
        return true;
      }

      if (!product.canPurchase) {
        console.warn('Product cannot be purchased currently:', product);
        return false;
      }

      return new Promise((resolve) => {
        this.activePurchaseResolver = resolve;
        
        const offer = product.getOffer ? product.getOffer() : product;

        store.order(offer).then((error: any) => {
          if (error) {
            console.error('Order error:', error);
            if (this.activePurchaseResolver) {
              this.activePurchaseResolver(false);
              this.activePurchaseResolver = null;
            }
          }
        }).catch((e: any) => {
          console.error(e);
          if (this.activePurchaseResolver) {
            this.activePurchaseResolver(false);
            this.activePurchaseResolver = null;
          }
        });

        // 3 minute timeout fallback
        setTimeout(() => {
          if (this.activePurchaseResolver) {
            this.activePurchaseResolver(false);
            this.activePurchaseResolver = null;
          }
        }, 180000);
      });
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  static async purchaseSubscription(plan: 'weekly' | 'monthly' | 'yearly'): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return this.simulatePurchase(plan);
    }

    try {
      const { store } = window.CdvPurchase || {};
      if (!store) throw new Error('Store not available');

      const productId = (PRODUCT_IDS as any)[plan];
      const product = store.get(productId);
      if (!product) throw new Error('Product not loaded');

      if (product.owned) {
        this.updateLocalStateFromPurchase(product);
        return true;
      }

      if (!product.canPurchase) {
         console.warn('Product cannot be purchased currently:', product);
         // If a subscription is in a weird state where it cannot be purchased but is owned implicitly handled above
         return false;
      }

      return new Promise((resolve) => {
        this.activePurchaseResolver = resolve;
        
        const offer = product.getOffer ? product.getOffer() : product;

        store.order(offer).then((error: any) => {
          if (error) {
            console.error('Order error:', error);
            if (this.activePurchaseResolver) {
              this.activePurchaseResolver(false);
              this.activePurchaseResolver = null;
            }
          }
        }).catch((e: any) => {
          console.error(e);
          if (this.activePurchaseResolver) {
            this.activePurchaseResolver(false);
            this.activePurchaseResolver = null;
          }
        });

        // 3 minute timeout fallback
        setTimeout(() => {
          if (this.activePurchaseResolver) {
            this.activePurchaseResolver(false);
            this.activePurchaseResolver = null;
          }
        }, 180000);
      });
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  static async restorePurchases(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const isActive = this.hasActiveSubscription();
          const hasDaily = this.hasActiveDailyPass();
          resolve(isActive || hasDaily);
        }, 1500);
      });
    }

    try {
      const { store } = window.CdvPurchase || {};
      if (!store) return false;
      
      await store.restorePurchases();
      this.syncStateWithStore();
      return this.hasActiveSubscription() || this.hasActiveDailyPass();
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  private static simulatePurchase(plan: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (plan === 'daily') {
          const expiry = new Date();
          expiry.setHours(expiry.getHours() + 24);
          localStorage.setItem('momo_daily_pass_expiry', expiry.toISOString());
        } else {
          localStorage.setItem('momo_sub_active', 'true');
          localStorage.setItem('momo_sub_plan', plan);
        }
        alert('Simulated purchase successful (Web mode)');
        resolve(true);
      }, 1000);
    });
  }
}
