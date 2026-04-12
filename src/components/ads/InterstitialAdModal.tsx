import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface InterstitialAdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InterstitialAdModal({ isOpen, onClose }: InterstitialAdModalProps) {
  const [timeLeft, setTimeLeft] = useState(3);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(3);
      setCanClose(false);
      
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanClose(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black dark:bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
      <div className="absolute top-4 right-4 flex items-center space-x-3">
        {!canClose && (
          <span className="text-white text-sm bg-white/20 px-3 py-1 rounded-full">
            Reward in {timeLeft}s
          </span>
        )}
        {canClose && (
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="text-center p-6 max-w-sm">
        <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 block">Advertisement</span>
        <div className="w-full aspect-video bg-gray-800 dark:bg-gray-900 rounded-xl mb-6 flex items-center justify-center border border-gray-700 dark:border-gray-800 shadow-2xl transition-colors">
          <span className="text-gray-500 dark:text-gray-400 font-bold text-xl">Google AdMob<br/>Interstitial Ad</span>
        </div>
        <h2 className="text-white text-2xl font-bold mb-2">Special Offer</h2>
        <p className="text-gray-400 dark:text-gray-500 mb-8">This is a simulated full-screen interstitial ad. In production, this will be replaced by the native AdMob SDK.</p>
        
        <button 
          onClick={() => {
            if (canClose) onClose();
          }}
          className={`w-full py-4 rounded-xl font-bold transition-all ${canClose ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800' : 'bg-gray-800 dark:bg-gray-900 text-gray-500 dark:text-gray-600 cursor-not-allowed'}`}
        >
          {canClose ? 'Continue to App' : `Wait ${timeLeft} seconds...`}
        </button>
      </div>
    </div>
  );
}
