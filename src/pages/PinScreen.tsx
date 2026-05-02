import React, { useState, useEffect } from 'react';
import { Lock, Delete, ShieldAlert, Globe } from 'lucide-react';
import { cn, COUNTRIES } from '../lib/utils';

interface PinScreenProps {
  onUnlock: () => void;
}

type ScreenMode = 'login' | 'setup' | 'setup_secret' | 'setup_country' | 'recovery';

export default function PinScreen({ onUnlock }: PinScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<ScreenMode>('login');
  const [setupPin, setSetupPin] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('UG');

  useEffect(() => {
    const savedPin = localStorage.getItem('momo_pin');
    if (!savedPin) {
      setMode('setup');
    }
  }, []);

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        setTimeout(() => processPin(newPin), 100);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const processPin = (currentPin: string) => {
    if (mode === 'setup') {
      if (!setupPin) {
        setSetupPin(currentPin);
        setPin('');
      } else {
        if (currentPin === setupPin) {
          setMode('setup_secret');
          setPin('');
        } else {
          setError(true);
          setPin('');
          setSetupPin('');
        }
      }
    } else if (mode === 'login') {
      const savedPin = localStorage.getItem('momo_pin');
      if (currentPin === savedPin) {
        onUnlock();
      } else {
        setError(true);
        setPin('');
      }
    }
  };

  if (mode === 'setup_secret' || mode === 'recovery') {
    return (
      <div className="flex flex-col items-center justify-center h-screen max-w-md mx-auto bg-blue-600 dark:bg-blue-900 text-white px-8 transition-colors">
        <div className="mb-8 flex flex-col items-center w-full">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            {mode === 'setup_secret' ? <Lock className="w-8 h-8 text-white" /> : <ShieldAlert className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold mb-2 text-center">
            {mode === 'setup_secret' ? 'Set Recovery Word' : 'Recover PIN'}
          </h1>
          <p className="text-blue-100 dark:text-blue-200 text-center mb-8 text-sm leading-relaxed">
            {mode === 'setup_secret' 
              ? 'Enter a secret word. You will use this to reset your PIN if you ever forget it.' 
              : 'Enter your secret recovery word to reset your PIN.'}
          </p>
          
          <input
            type="text"
            value={secretInput}
            onChange={(e) => {
              setSecretInput(e.target.value);
              setError(false);
            }}
            placeholder="e.g. myfirstpet"
            className={cn(
              "w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-white transition-colors",
              error ? "border-red-400 bg-red-500/10" : "border-white/20"
            )}
            autoFocus
          />
          {error && mode === 'recovery' && (
            <p className="text-red-300 text-sm mt-2 w-full text-left">Incorrect secret word.</p>
          )}
          
          <button
            onClick={() => {
              if (!secretInput.trim()) return;
              
              if (mode === 'setup_secret') {
                localStorage.setItem('momo_pin', setupPin);
                localStorage.setItem('momo_secret', secretInput.trim().toLowerCase());
                setMode('setup_country');
              } else if (mode === 'recovery') {
                const savedSecret = localStorage.getItem('momo_secret');
                if (savedSecret && secretInput.trim().toLowerCase() === savedSecret) {
                  localStorage.removeItem('momo_pin');
                  setMode('setup');
                  setSetupPin('');
                  setPin('');
                  setSecretInput('');
                  setError(false);
                } else {
                  setError(true);
                }
              }
            }}
            className="w-full bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-900 font-bold py-3.5 rounded-xl mt-6 hover:bg-blue-50 dark:hover:bg-white transition-colors active:scale-[0.98]"
          >
            {mode === 'setup_secret' ? 'Save & Continue' : 'Verify & Reset PIN'}
          </button>

          {mode === 'recovery' && (
            <button 
              onClick={() => {
                setMode('login');
                setSecretInput('');
                setError(false);
              }}
              className="mt-6 text-blue-200 dark:text-blue-300 text-sm font-medium hover:text-white transition-colors p-2"
            >
              Back to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'setup_country') {
    return (
      <div className="flex flex-col items-center justify-center h-screen max-w-md mx-auto bg-blue-600 dark:bg-blue-900 text-white px-8 transition-colors">
        <div className="mb-8 flex flex-col items-center w-full">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-center">Choose Country</h1>
          <p className="text-blue-100 dark:text-blue-200 text-center mb-8 text-sm leading-relaxed">
            Select your country to set the correct currency for your transactions.
          </p>
          
          <div className="w-full relative">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white transition-colors appearance-none"
            >
              {COUNTRIES.map(country => (
                <option key={country.code} value={country.code} className="text-gray-900">
                  {country.name} ({country.currency})
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => {
              const country = COUNTRIES.find(c => c.code === selectedCountry);
              if (country) {
                localStorage.setItem('momo_currency', country.currency);
                localStorage.setItem('momo_country', country.code);
              }
              onUnlock();
            }}
            className="w-full bg-white dark:bg-gray-100 text-blue-600 dark:text-blue-900 font-bold py-3.5 rounded-xl mt-6 hover:bg-blue-50 dark:hover:bg-white transition-colors active:scale-[0.98]"
          >
            Finish Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen max-w-md mx-auto bg-blue-600 dark:bg-blue-900 text-white transition-colors">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Momo Tracker</h1>
        <p className="text-blue-100 dark:text-blue-200 text-center px-8">
          {mode === 'setup' 
            ? (!setupPin ? 'Create a 4-digit PIN' : 'Confirm your PIN')
            : 'Enter your PIN to unlock'}
        </p>
      </div>

      <div className="flex space-x-4 mb-12">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full transition-all duration-300",
              pin.length > i ? "bg-white" : "bg-blue-400/50 dark:bg-blue-800/50",
              error && "bg-red-400 animate-pulse"
            )}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 px-8 w-full max-w-xs">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePress(num.toString())}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors mx-auto"
          >
            {num}
          </button>
        ))}
        <div /> {/* Empty space for alignment */}
        <button
          onClick={() => handlePress('0')}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors mx-auto"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors mx-auto"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {mode === 'login' && (
        <button 
          onClick={() => {
            const savedSecret = localStorage.getItem('momo_secret');
            if (savedSecret) {
              setMode('recovery');
              setError(false);
              setSecretInput('');
            } else {
              if (window.confirm('Are you sure you want to reset your PIN?')) {
                localStorage.removeItem('momo_pin');
                window.location.reload();
              }
            }
          }}
          className="mt-12 text-blue-200 dark:text-blue-300 text-sm font-medium hover:text-white transition-colors p-2"
        >
          Forgot PIN?
        </button>
      )}
    </div>
  );
}
