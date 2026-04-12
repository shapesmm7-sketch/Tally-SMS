import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { ArrowLeft, Trash2, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { useInterstitialAd } from '../hooks/useInterstitialAd';

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { showInterstitialModal, handleAdClosed, triggerAction } = useInterstitialAd();

  const tx = useLiveQuery(() => db.transactions.get(Number(id)), [id]);

  const handleBack = () => {
    triggerAction(() => navigate(-1));
  };

  if (tx === undefined) {
    return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Loading...</div>;
  }
  
  if (tx === null) {
    return (
      <div className="flex flex-col min-h-full bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
          <button type="button" onClick={handleBack} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2 text-gray-800 dark:text-white">Not Found</h1>
        </div>
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">Transaction not found</div>
      </div>
    );
  }

  const handleDelete = async () => {
    await db.transactions.delete(tx.id!);
    triggerAction(() => navigate('/'));
  };

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] relative transition-colors">
      <div className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="flex items-center">
          <button type="button" onClick={handleBack} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold ml-2 text-gray-800 dark:text-white">Transaction Details</h1>
        </div>
        <button type="button" onClick={() => setShowDeleteConfirm(true)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 flex-1">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-6 flex flex-col items-center text-center transition-colors">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4",
            tx.type === 'income' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          )}>
            {tx.type === 'income' ? <ArrowDownRight className="w-8 h-8" /> : <ArrowUpRight className="w-8 h-8" />}
          </div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">
            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{tx.category}</p>
        </div>

        {tx.rawMessage && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/30 overflow-hidden transition-colors">
            <div className="px-4 py-3 border-b border-blue-100 dark:border-blue-900/30 bg-blue-100/50 dark:bg-blue-900/40">
              <h3 className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Original SMS Message</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap leading-relaxed">{tx.rawMessage}</p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
          <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Extracted Details</h3>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {tx.senderReceiverName && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Name</span>
                <span className="font-medium text-gray-800 dark:text-white text-right">{tx.senderReceiverName}</span>
              </div>
            )}
            {tx.tid && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Transaction ID</span>
                <span className="font-medium text-gray-800 dark:text-white text-right">{tx.tid}</span>
              </div>
            )}
            <div className="p-4 flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 text-sm">Date</span>
              <span className="font-medium text-gray-800 dark:text-white text-right">
                {tx.smsDate || format(parseISO(tx.date), 'MMM d, yyyy')}
              </span>
            </div>
            {tx.smsTime && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Time</span>
                <span className="font-medium text-gray-800 dark:text-white text-right">{tx.smsTime}</span>
              </div>
            )}
            {tx.balance !== undefined && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Balance</span>
                <span className="font-medium text-gray-800 dark:text-white text-right">{formatCurrency(tx.balance)}</span>
              </div>
            )}
            {tx.fee !== undefined && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Fee</span>
                <span className="font-medium text-gray-800 dark:text-white text-right">{formatCurrency(tx.fee)}</span>
              </div>
            )}
            {tx.phoneNumber && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Phone</span>
                <span className="font-medium text-gray-800 dark:text-white text-right">{tx.phoneNumber}</span>
              </div>
            )}
            {tx.provider && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Provider</span>
                <span className="font-medium text-gray-800 dark:text-white text-right">{tx.provider}</span>
              </div>
            )}
            {tx.note && !tx.senderReceiverName && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 text-sm">Note</span>
                <span className="font-medium text-gray-800 dark:text-white text-right">{tx.note}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">Delete Transaction?</h3>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
              This action cannot be undone. The transaction will be permanently removed from your history.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

