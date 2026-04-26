import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { db } from '../lib/db';
import { cn, formatCurrency } from '../lib/utils';
import { parseMoMoSMS, ParsedSMS, parseTransactionDate, normalizeProviderName } from '../lib/smsParser';

export default function AddTransaction() {
  const navigate = useNavigate();
  const [smsText, setSmsText] = useState('');
  const [parsed, setParsed] = useState<ParsedSMS | null>(null);
  const [manualProvider, setManualProvider] = useState<string>('');

  useEffect(() => {
    if (smsText.trim().length > 10) {
      const result = parseMoMoSMS(smsText);
      setParsed(result);
      if (result && result.provider) {
        setManualProvider(result.provider);
      } else {
        setManualProvider('');
      }
    } else {
      setParsed(null);
      setManualProvider('');
    }
  }, [smsText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed) return;

    if (parsed.transaction_id) {
      const existingTx = await db.transactions.where('tid').equals(parsed.transaction_id).first();
      if (existingTx) {
        alert('This transaction is already added to the system so you can\'t add it again.');
        return;
      }
    }

    const type = parsed.transaction_type === 'deposit' ? 'income' : 'expense';
    let note = '';
    if (parsed.sender_name) note = `From ${parsed.sender_name}`;
    else if (parsed.receiver_name) note = `To ${parsed.receiver_name}`;

    const categoryName = parsed.transaction_type.charAt(0).toUpperCase() + parsed.transaction_type.slice(1);

    const txDate = parseTransactionDate(parsed.date, parsed.time);

    await db.transactions.add({
      amount: parsed.amount || 0,
      type,
      category: categoryName,
      note,
      date: txDate,
      createdAt: new Date().toISOString(),
      tid: parsed.transaction_id || undefined,
      senderReceiverName: parsed.sender_name || parsed.receiver_name || undefined,
      smsDate: parsed.date || undefined,
      smsTime: parsed.time || undefined,
      currency: parsed.currency || undefined,
      phoneNumber: parsed.phone_number || undefined,
      balance: parsed.balance || undefined,
      fee: parsed.fee || undefined,
      provider: normalizeProviderName(manualProvider) || parsed.provider || undefined,
      rawMessage: parsed.raw_message
    });

    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold ml-2 text-gray-800 dark:text-white">Paste SMS</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paste Mobile Money SMS here:</label>
          <textarea
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            className="w-full h-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm transition-colors"
            placeholder="e.g. You have received $50 or UGX 50,000 from JOHN DOE..."
            autoFocus
          />
        </div>

        {parsed && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Detected / Manual Mobile Money Line</label>
            <input
              type="text"
              value={manualProvider}
              onChange={(e) => setManualProvider(e.target.value)}
              placeholder="e.g. MTN, Airtel, M-Pesa"
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
            />
            <p className="text-xs text-gray-500 mt-2">If your line was not automatically detected, type it here.</p>
          </div>
        )}

        {smsText.trim().length > 10 && !parsed && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-start text-sm">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
            <p>Could not detect a valid financial transaction. Please ensure you pasted the full SMS.</p>
          </div>
        )}

        <div className="mt-auto pt-4 pb-6">
          <button
            type="submit"
            disabled={!parsed || smsText.trim().length === 0}
            className="w-full bg-blue-600 dark:bg-blue-700 text-white rounded-xl py-4 flex items-center justify-center font-medium shadow-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Check className="w-5 h-5 mr-2" />
            Save Transaction
          </button>

          <div className="mt-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
               onClick={() => navigate('/scan-sms')}
          >
             <div>
               <p className="font-semibold text-blue-800 dark:text-blue-300">Scan from another phone</p>
               <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Use your camera to read the SMS</p>
             </div>
             <div className="bg-blue-600 text-white p-2 rounded-full shadow-sm flex-shrink-0">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
             </div>
          </div>
        </div>
      </form>
    </div>
  );
}
