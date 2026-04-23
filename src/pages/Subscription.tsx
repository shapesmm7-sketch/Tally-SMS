import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, RefreshCw, ShieldCheck, Gift } from 'lucide-react';
import { BillingManager } from '../lib/BillingManager';
import { cn, formatCurrency } from '../lib/utils';
import { useAccessControl } from '../hooks/useAccessControl';

export default function Subscription() {
  const navigate = useNavigate();
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const { isTrial, daysLeft, isPremium } = useAccessControl();
  const [exchangeRate, setExchangeRate] = useState<number>(1);

  const currency = localStorage.getItem('momo_currency') || 'USD';
  const [localizedPrices, setLocalizedPrices] = useState<Record<string, string>>({
    daily: '$0.25',
    weekly: '$0.70',
    monthly: '$2.00',
    yearly: '$19.00'
  });

  useEffect(() => {
    // Attempt to load localized prices from Google Play Store if native
    const loadPrices = () => {
      const prices = BillingManager.getLocalizedPrices();
      setLocalizedPrices(prices);
    };

    loadPrices();
    
    // Sometimes store takes a moment to initialize prices over network
    // We poll briefly in case prices haven't populated yet
    const interval = setInterval(() => {
       const prices = BillingManager.getLocalizedPrices();
       // Only update if they look like they've changed dynamically from the store
       if (prices.monthly !== '$2.00') {
          setLocalizedPrices(prices);
          clearInterval(interval);
       }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Only attempt currency API exchange if we are strictly using the web fallback
    // In native mode, Google Play handles everything
    if (!window.CdvPurchase && currency !== 'USD') {
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(res => res.json())
        .then(data => {
          if (data && data.rates && data.rates[currency]) {
            setExchangeRate(data.rates[currency]);
          }
        })
        .catch(err => console.error('Failed to fetch exchange rates', err));
    }
  }, [currency]);

  // If we have localized prices from store, don't multiply by exchange rate
  const hasDynamicPrices = localizedPrices.monthly !== '$2.00';

  const getDisplayPrice = (planId: keyof typeof localizedPrices, amount: number) => {
    if (hasDynamicPrices) {
       return localizedPrices[planId];
    }
    return formatCurrency(amount * exchangeRate);
  };

  const plans = [
    { id: 'daily', name: 'Daily Pass', amount: 0.25, period: '24 hours', desc: 'One-time payment' },
    { id: 'weekly', name: 'Weekly Plan', amount: 0.70, period: 'per week', desc: 'Auto-renewing' },
    { id: 'monthly', name: 'Monthly Plan', amount: 2.00, period: 'per month', desc: 'Auto-renewing, most popular' },
    { id: 'yearly', name: 'Yearly Plan', amount: 19.00, period: 'per year', desc: 'Auto-renewing, best value' },
  ] as const;

  const handleRestore = async () => {
    setIsRestoring(true);
    const success = await BillingManager.restorePurchases();
    setIsRestoring(false);
    if (success) {
      alert('Purchases restored successfully!');
      navigate(-1);
    } else {
      alert('No active purchases found.');
    }
  };

  const handlePurchase = async () => {
    setIsPurchasing(true);
    let success = false;
    
    if (selectedPlan === 'daily') {
      success = await BillingManager.purchaseDailyPass();
    } else {
      success = await BillingManager.purchaseSubscription(selectedPlan);
    }
    
    setIsPurchasing(false);
    
    if (success) {
      alert('Purchase successful! Thank you.');
      navigate(-1);
    } else {
      alert('Purchase failed. Please try again.');
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] pb-8 transition-colors">
      <div className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2 text-gray-800 dark:text-white">Premium</h1>
        </div>
        <button 
          onClick={handleRestore}
          disabled={isRestoring}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center disabled:opacity-50"
        >
          {isRestoring ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : null}
          Restore
        </button>
      </div>

      <div className="p-6">
        {isTrial && !isPremium && (
          <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">Enjoy all premium features free for 30 days 🎉</p>
              <p className="text-xs text-green-100 mt-1">{daysLeft} days left in your trial</p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unlock Unlimited</h2>
          <p className="text-gray-600 dark:text-gray-400">Get unlimited SMS auto-detection and premium features.</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 mb-8 transition-colors">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Premium Benefits</h3>
          <ul className="space-y-3">
            {[
              'Unlimited SMS auto-detection',
              'Unlimited manual Scanning',
              'Download Reports',
              'No daily transaction limits',
              'Priority customer support',
              'Ad-free experience'
            ].map((benefit, i) => (
              <li key={i} className="flex items-start">
                <ShieldCheck className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 shrink-0" />
                <span className="text-gray-600 dark:text-gray-400 text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 mb-8">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={cn(
                "border-2 rounded-2xl p-4 cursor-pointer transition-all",
                selectedPlan === plan.id 
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-800"
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold text-gray-900 dark:text-white">{plan.name}</h4>
                <div className="text-right">
                  <span className="font-bold text-lg text-gray-900 dark:text-white">
                    {getDisplayPrice(plan.id, plan.amount)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">/{plan.period}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{plan.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handlePurchase}
          disabled={isPurchasing}
          className="w-full bg-blue-600 dark:bg-blue-700 text-white rounded-xl py-4 font-bold shadow-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-70 flex items-center justify-center"
        >
          {isPurchasing ? (
            <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
          ) : (
            `Subscribe for ${selectedPlanData ? getDisplayPrice(selectedPlanData.id, selectedPlanData.amount) : ''}`
          )}
        </button>
        
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4 px-4">
          Subscriptions automatically renew unless canceled in your Google Play settings.
        </p>
      </div>
    </div>
  );
}
