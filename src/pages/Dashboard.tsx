import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/db';
import { formatCurrency, cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, ArrowRight, MessageSquareText, RefreshCw, Crown, AlertTriangle, X, Info } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { scanAndImportSMS } from '../lib/smsScanner';
import { Capacitor } from '@capacitor/core';
import { useAccessControl } from '../hooks/useAccessControl';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import LimitModal from '../components/LimitModal';
import NativeAd from '../components/ads/NativeAd';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scanError, setScanError] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  
  const { isTrial, daysLeft, isPremium, manualScanUsage, dailyLimit, canProcessManualScan, getManualScanAllowance, recordManualScanUsage } = useAccessControl();
  const { triggerAction } = useInterstitialAd();

  const transactions = useLiveQuery(async () => {
    const allTxs = await db.transactions.orderBy('date').reverse().toArray();
    return allTxs.filter(tx => isToday(parseISO(tx.date)));
  }) || [];

  const handleScanSMS = async () => {
    if (!canProcessManualScan()) {
      setShowLimitModal(true);
      return;
    }

    // Check if we have permission first
    const smsPlugin = (window as any).SMS || (window as any).sms || (window as any).cordova?.plugins?.sms;
    if (Capacitor.isNativePlatform() && smsPlugin) {
      if (typeof smsPlugin.hasPermission === 'function') {
        smsPlugin.hasPermission(
          (has: boolean) => {
            if (!has) {
              setShowSmsModal(true);
            } else {
              startSmsScan();
            }
          },
          () => setShowSmsModal(true)
        );
      } else {
        // If hasPermission is not available, try to proceed
        startSmsScan();
      }
    } else {
      startSmsScan();
    }
  };

  const startSmsScan = async () => {
    setIsScanning(true);
    setScanError('');
    setScanMessage('Starting scan...');

    await scanAndImportSMS(
      getManualScanAllowance(),
      (msg) => setScanMessage(msg),
      (count) => {
        if (count > 0) {
          setScanMessage(`Scan complete! Found and successfully added ${count} new transactions to your History section.`);
          recordManualScanUsage(count);
        } else {
          setScanMessage(`Scan complete! No new transactions found in your inbox.`);
        }
        
        setTimeout(() => {
          setIsScanning(false);
          setScanMessage('');
        }, 4000); // Increased slightly so they can read the longer message
      },
      (err) => {
        setScanError(err);
        setIsScanning(false);
        if (err.includes('limit reached')) {
            setShowLimitModal(true);
        }
      }
    );
  };

  const requestSmsPermission = () => {
    setSmsError(null);
    const smsPlugin = window.SMS || (window as any).sms || (window as any).cordova?.plugins?.sms;
    
    if (!smsPlugin) {
      setSmsError('SMS plugin not found. Please ensure the app is built correctly and running on a real Android device.');
      return;
    }

    setIsRequesting(true);

    // Set a safety timeout
    const timeout = setTimeout(() => {
      setIsRequesting(false);
      setSmsError('Permission request timed out. Please try again.');
    }, 10000);

    const handleSuccess = () => {
      clearTimeout(timeout);
      setIsRequesting(false);
      setShowSmsModal(false);
      startSmsScan();
    };

    const handleError = (err: any) => {
      clearTimeout(timeout);
      setIsRequesting(false);
      console.error('SMS Permission Error:', err);
      setSmsError('SMS permission denied.');
    };

    try {
      if (typeof smsPlugin.requestPermission === 'function') {
        smsPlugin.requestPermission(handleSuccess, handleError);
      } else if (typeof smsPlugin.hasPermission === 'function') {
        smsPlugin.hasPermission((hasPerm: boolean) => {
          if (hasPerm) {
            handleSuccess();
          } else {
            if (typeof smsPlugin.listSMS === 'function') {
              smsPlugin.listSMS({ box: 'inbox', indexFrom: 0, maxCount: 1 }, handleSuccess, handleError);
            } else {
              handleError('Permission not granted and request method unavailable.');
            }
          }
        }, handleError);
      } else {
        handleSuccess();
      }
    } catch (error) {
      clearTimeout(timeout);
      setIsRequesting(false);
      console.error('SMS Permission Exception:', error);
      setSmsError('An unexpected error occurred while requesting permission.');
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] relative transition-colors">
      {/* Header */}
      <div className="bg-blue-600 dark:bg-blue-700 px-6 pt-12 pb-12 rounded-b-[2.5rem] text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold opacity-90">{t('dashboard.title')}</h1>
            <p className="text-sm opacity-75">{t('dashboard.welcome')}</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 -mt-6 relative z-10">
        <Link 
          to="/add" 
          className="w-full bg-blue-600 dark:bg-blue-700 text-white rounded-2xl p-6 flex flex-col items-center justify-center shadow-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-all text-center border border-white/10"
        >
          <MessageSquareText className="w-8 h-8 mb-3 opacity-90" />
          <span className="font-medium text-sm leading-relaxed max-w-[200px]">
            {t('dashboard.paste_sms')}
          </span>
        </Link>
      </div>

      {/* Ad Placement */}
      <div className="px-6 mt-4">
        <NativeAd />
      </div>

      {/* Recent Transactions */}
      <div className="px-6 pb-6 mt-4 flex-1">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('dashboard.today_transactions')}</h2>
          <Link to="/transactions" className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center">
            {t('dashboard.history')} <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.no_transactions')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.check_history')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  onClick={() => triggerAction(() => navigate(`/transaction/${tx.id}`))}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      tx.type === 'income' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    )}>
                      {tx.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white truncate">
                        {tx.senderReceiverName || (tx.type === 'income' ? t('dashboard.money_received') : t('dashboard.money_sent'))}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(parseISO(tx.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end shrink-0 pl-2">
                    <p className={cn(
                      "font-semibold",
                      tx.type === 'income' ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-gray-200"
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[140px] mt-0.5" title={tx.rawMessage || tx.note}>
                      {tx.rawMessage || tx.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Limit Reached Modal */}
      {showLimitModal && (
        <LimitModal onClose={() => setShowLimitModal(false)} />
      )}

      {/* SMS Permission Explanation Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center relative">
              <button 
                onClick={() => setShowSmsModal(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {t('settings.sms_explanation_title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6">
                {t('settings.sms_explanation_body')}
              </p>

              {smsError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-6 text-left">
                  {smsError}
                </div>
              )}
              
              <button 
                onClick={requestSmsPermission}
                disabled={isRequesting}
                className={`w-full bg-blue-600 dark:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 dark:hover:bg-blue-800 transition-all active:scale-[0.98] flex items-center justify-center ${isRequesting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isRequesting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('common.loading') || 'Processing...'}</span>
                  </div>
                ) : (
                  t('settings.sms_explanation_btn')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
