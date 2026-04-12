import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Smartphone, Database, FileText, Crown, ChevronRight, AlertCircle, Globe, Moon, Sun, Trash2, Languages, X, Info } from 'lucide-react';
import { db } from '../lib/db';
import { COUNTRIES } from '../lib/utils';
import { useAccessControl } from '../hooks/useAccessControl';
import { useTheme } from '../context/ThemeContext';
import { Capacitor } from '@capacitor/core';

export default function Settings() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isPremium } = useAccessControl();
  const { theme, toggleTheme } = useTheme();
  const [smsEnabled, setSmsEnabled] = useState(localStorage.getItem('momo_sms_enabled') === 'true');
  const [selectedCountry, setSelectedCountry] = useState(localStorage.getItem('momo_country') || 'UG');
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);

  useEffect(() => {
    // Check actual permission on mount if it was supposed to be enabled
    if (smsEnabled && Capacitor.isNativePlatform() && window.SMS) {
      window.SMS.hasPermission(
        (has) => {
          if (!has) {
            setSmsEnabled(false);
            localStorage.setItem('momo_sms_enabled', 'false');
          }
        },
        () => {}
      );
    }
  }, []);

  const handleSmsToggle = async () => {
    if (smsEnabled) {
      // Turning off is simple
      setSmsEnabled(false);
      localStorage.setItem('momo_sms_enabled', 'false');
      return;
    }

    // Turning on requires explanation and permission
    if (Capacitor.isNativePlatform()) {
      setShowSmsModal(true);
    } else {
      alert('SMS Auto-Detection is only available on Android devices.');
    }
  };

  const requestSmsPermission = () => {
    setSmsError(null);
    const smsPlugin = window.SMS || (window as any).sms || (window as any).cordova?.plugins?.sms;
    
    if (!smsPlugin) {
      setSmsError('SMS plugin not found. Please ensure the app is built correctly and running on a real Android device.');
      return;
    }

    if (typeof smsPlugin.requestPermission !== 'function') {
      setSmsError('SMS plugin found but requestPermission is not available. Version mismatch?');
      return;
    }

    setIsRequesting(true);

    // Set a safety timeout in case the plugin doesn't respond
    const timeout = setTimeout(() => {
      setIsRequesting(false);
      setSmsError('Permission request timed out. Please try again.');
    }, 10000);

    try {
      smsPlugin.requestPermission(
        () => {
          clearTimeout(timeout);
          setIsRequesting(false);
          // Permission granted
          setSmsEnabled(true);
          localStorage.setItem('momo_sms_enabled', 'true');
          setShowSmsModal(false);
          // Optional: show a success toast here if you have one
        },
        (err: any) => {
          clearTimeout(timeout);
          setIsRequesting(false);
          // Permission denied
          console.error('SMS Permission Error:', err);
          setSmsError('Permission denied or error occurred. SMS Auto-Detection cannot be enabled.');
        }
      );
    } catch (error) {
      clearTimeout(timeout);
      setIsRequesting(false);
      console.error('SMS Permission Exception:', error);
      setSmsError('An unexpected error occurred while requesting permission.');
    }
  };

  const handleClearData = async () => {
    if (window.confirm('WARNING: This will delete all your transactions. Are you sure?')) {
      await db.transactions.clear();
      alert('Data cleared successfully.');
    }
  };

  const handleResetPin = () => {
    if (window.confirm('Are you sure you want to reset your PIN? You will be logged out.')) {
      localStorage.removeItem('momo_pin');
      localStorage.removeItem('momo_secret');
      window.location.reload();
    }
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const country = COUNTRIES.find(c => c.code === code);
    if (country) {
      setSelectedCountry(code);
      localStorage.setItem('momo_country', code);
      localStorage.setItem('momo_currency', country.currency);
      window.location.reload(); // Reload to apply currency changes everywhere
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('momo_language', newLang);
  };

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] pb-8 transition-colors">
      <div className="bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{t('settings.title')}</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Premium Banner */}
        <div 
          onClick={() => navigate('/subscription')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-md relative overflow-hidden cursor-pointer hover:shadow-lg transition-all"
        >
          <Crown className="absolute -right-4 -top-4 w-24 h-24 text-white/10" />
          <h2 className="text-lg font-bold mb-1 flex items-center">
            <Crown className="w-5 h-5 mr-2" />
            {isPremium ? t('common.premium_active') : t('common.upgrade')}
          </h2>
          <p className="text-amber-50 text-sm mb-4">
            {isPremium 
              ? t('common.premium_active_desc') 
              : t('common.premium_desc')}
          </p>
          {!isPremium && (
            <button 
              className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-50 transition-colors"
            >
              {t('common.upgrade_now')}
            </button>
          )}
        </div>

        {/* Features */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">{t('settings.preferences')}</h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 transition-colors">
            
            <div className="p-4 flex items-center justify-between relative">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{t('settings.language')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.select_language')}</p>
                </div>
              </div>
              <div className="relative">
                <select 
                  value={i18n.language}
                  onChange={handleLanguageChange}
                  className="appearance-none bg-gray-100 dark:bg-gray-800 border-none rounded-lg py-2 pl-3 pr-8 text-sm text-gray-700 dark:text-gray-200 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="es">Español</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                  <option value="sw">Kiswahili</option>
                </select>
                <ChevronRight className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{t('settings.sms_detection')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.sms_desc')}</p>
                </div>
              </div>
              <button 
                onClick={handleSmsToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${smsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${smsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{t('settings.dark_mode')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.dark_mode_desc')}</p>
                </div>
              </div>
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between relative">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{t('settings.country_currency')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.country_desc')}</p>
                </div>
              </div>
              <div className="relative">
                <select 
                  value={selectedCountry}
                  onChange={handleCountryChange}
                  className="appearance-none bg-gray-100 dark:bg-gray-800 border-none rounded-lg py-2 pl-3 pr-8 text-sm text-gray-700 dark:text-gray-200 font-medium focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">{t('settings.security')}</h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 transition-colors">
            <button onClick={handleResetPin} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{t('settings.change_pin')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Data */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">{t('settings.data')}</h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 transition-colors">
            <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <Database className="w-4 h-4" />
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{t('settings.backup')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button onClick={handleClearData} className="w-full p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span className="font-medium text-red-600 dark:text-red-400">{t('settings.clear_data')}</span>
              </div>
            </button>
          </div>
        </div>

        {/* About */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">{t('settings.about')}</h3>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 transition-colors">
            <button 
              onClick={() => navigate('/privacy')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{t('settings.privacy')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button 
              onClick={() => navigate('/terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{t('settings.terms')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-gray-400">MoMo Tracker Web v1.0.0</p>
        </div>
      </div>

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
