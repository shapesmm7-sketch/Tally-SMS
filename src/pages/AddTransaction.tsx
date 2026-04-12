import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { db } from '../lib/db';
import { cn, formatCurrency } from '../lib/utils';
import { parseMoMoSMS, ParsedSMS } from '../lib/smsParser';

export default function AddTransaction() {
  const navigate = useNavigate();
  const [smsText, setSmsText] = useState('');
  const [parsed, setParsed] = useState<ParsedSMS | null>(null);

  useEffect(() => {
    if (smsText.trim().length > 10) {
      const result = parseMoMoSMS(smsText);
      setParsed(result);
    } else {
      setParsed(null);
    }
  }, [smsText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed) return;

    const type = parsed.transaction_type === 'deposit' ? 'income' : 'expense';
    let note = '';
    if (parsed.sender_name) note = `From ${parsed.sender_name}`;
    else if (parsed.receiver_name) note = `To ${parsed.receiver_name}`;

    const categoryName = parsed.transaction_type.charAt(0).toUpperCase() + parsed.transaction_type.slice(1);

    await db.transactions.add({
      amount: parsed.amount || 0,
      type,
      category: categoryName,
      note,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tid: parsed.transaction_id || undefined,
      senderReceiverName: parsed.sender_name || parsed.receiver_name || undefined,
      smsDate: parsed.date || undefined,
      smsTime: parsed.time || undefined,
      currency: parsed.currency || undefined,
      phoneNumber: parsed.phone_number || undefined,
      balance: parsed.balance || undefined,
      fee: parsed.fee || undefined,
      provider: parsed.provider || undefined,
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
            placeholder="e.g. Yello. You have received UGX 50,000 from JOHN DOE..."
            autoFocus
          />
        </div>

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
        </div>
      </form>
    </div>
  );
}
