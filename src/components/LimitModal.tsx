import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle } from 'lucide-react';
import { useAccessControl } from '../hooks/useAccessControl';

interface LimitModalProps {
  onClose: () => void;
  message?: string;
}

export default function LimitModal({ onClose, message }: LimitModalProps) {
  const navigate = useNavigate();
  const { dailyLimit } = useAccessControl();

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Daily Limit Reached</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            {message || `You've reached your daily limit of ${dailyLimit} transactions. Upgrade to enjoy unlimited auto-detection and manual scanning.`}
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={() => {
                onClose();
                navigate('/subscription');
              }}
              className="w-full bg-blue-600 dark:bg-blue-700 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            >
              Unlock for Today ($0.25)
            </button>
            <button 
              onClick={() => {
                onClose();
                navigate('/subscription');
              }}
              className="w-full bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-gray-700 font-bold py-3.5 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              Go Premium (Weekly / Monthly)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
