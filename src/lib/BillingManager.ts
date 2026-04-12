/**
 * BillingManager
 * 
 * In a native Android app via CodeMagic, this logic will be replaced or wrapped 
 * by the Google Play Billing Library (e.g., using @revenuecat/purchases-capacitor 
 * or @capacitor-community/in-app-purchases).
 * 
 * For now, this class simulates the Google Play Billing flow locally so the UI 
 * and logic can be fully implemented and tested.
 */
export class BillingManager {
  static hasActiveSubscription(): boolean {
    // In production, this checks the native billing library cache
    return localStorage.getItem('momo_sub_active') === 'true';
  }

  static hasActiveDailyPass(): boolean {
    const expiry = localStorage.getItem('momo_daily_pass_expiry');
    if (!expiry) return false;
    return new Date(expiry) > new Date();
  }

  static async purchaseDailyPass(): Promise<boolean> {
    // Simulate Google Play Billing flow for a consumable
    return new Promise((resolve) => {
      setTimeout(() => {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);
        localStorage.setItem('momo_daily_pass_expiry', expiry.toISOString());
        console.log('Purchase success: Daily Pass');
        resolve(true);
      }, 1000);
    });
  }

  static async purchaseSubscription(plan: 'weekly' | 'monthly' | 'yearly'): Promise<boolean> {
    // Simulate Google Play Billing flow for a subscription
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem('momo_sub_active', 'true');
        localStorage.setItem('momo_sub_plan', plan);
        console.log(`Purchase success: ${plan} subscription`);
        resolve(true);
      }, 1000);
    });
  }

  static async restorePurchases(): Promise<boolean> {
    // Simulate checking Google Play for active purchases
    // In production, this calls the native billing library to sync state
    return new Promise((resolve) => {
      setTimeout(() => {
        const isActive = localStorage.getItem('momo_sub_active') === 'true';
        const hasDaily = this.hasActiveDailyPass();
        resolve(isActive || hasDaily);
      }, 1500);
    });
  }
}
