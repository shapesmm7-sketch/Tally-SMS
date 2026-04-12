import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, List, PieChart, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import BannerAd from './ads/BannerAd';
import { useInterstitialAd } from '../hooks/useInterstitialAd';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showInterstitialModal, handleAdClosed, triggerAction } = useInterstitialAd();

  const navItems = [
    { to: '/', icon: Home, label: t('common.nav.home') },
    { to: '/transactions', icon: List, label: t('common.nav.history') },
    { to: '/reports', icon: PieChart, label: t('common.nav.reports') },
    { to: '/settings', icon: Settings, label: t('common.nav.settings') },
  ];

  const showBannerAd = ['/', '/transactions', '/reports'].includes(location.pathname);

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    e.preventDefault();
    if (location.pathname === to) return;
    
    // Trigger interstitial logic on navigation
    triggerAction(() => {
      navigate(to);
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[var(--background)] shadow-xl overflow-hidden relative transition-colors">
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
        {/* Banner Ad fixed at the bottom of the content area, above the nav bar */}
        {showBannerAd && <BannerAd />}
      </main>

      {/* Bottom Navigation */}
      <nav className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center h-16 px-2 z-50 shrink-0 rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors">
        {navItems.map((item) => (
          <a
            key={item.to}
            href={item.to}
            onClick={(e) => handleNavClick(e, item.to)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors cursor-pointer",
              location.pathname === item.to 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
