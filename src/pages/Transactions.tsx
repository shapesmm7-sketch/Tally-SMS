import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { formatCurrency, cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Filter, Search, Trash2, Calendar, Download } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear, isSameDay } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { useAccessControl } from '../hooks/useAccessControl';
import { normalizeProviderName } from '../lib/smsParser';
import PDFExport from '../lib/pdfExport';

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export default function Transactions() {
  const { t } = useTranslation();
  const { isPremium, isTrial } = useAccessControl();
  const needsAdForPdf = !isPremium;
  
  const DATE_FILTERS: { id: DateFilter; label: string }[] = [
    { id: 'all', label: t('reports.all_time') },
    { id: 'today', label: t('reports.today') },
    { id: 'yesterday', label: t('reports.yesterday') },
    { id: 'week', label: t('reports.this_week') },
    { id: 'month', label: t('reports.this_month') },
    { id: 'year', label: t('reports.this_year') },
  ];
  const navigate = useNavigate();
  const { triggerAction, forceAd } = useInterstitialAd();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [customDate, setCustomDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const availableProviders = useLiveQuery(async () => {
    const all = await db.transactions.toArray();
    const providers = new Set(all.map(tx => normalizeProviderName(tx.provider || '')).filter(Boolean));
    return Array.from(providers) as string[];
  }, []) || [];

  const transactions = useLiveQuery(async () => {
    let collection = db.transactions.orderBy('date').reverse();
    const all = await collection.toArray();
    
    return all.filter(tx => {
      const matchType = filterType === 'all' || tx.type === filterType;
      const matchSearch = tx.category.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (tx.note && tx.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (tx.senderReceiverName && tx.senderReceiverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (tx.tid && tx.tid.includes(searchQuery));
      
      let matchDate = true;
      if (dateFilter !== 'all') {
        const txDate = parseISO(tx.date);
        if (dateFilter === 'today') matchDate = isToday(txDate);
        else if (dateFilter === 'yesterday') matchDate = isYesterday(txDate);
        else if (dateFilter === 'week') matchDate = isThisWeek(txDate);
        else if (dateFilter === 'month') matchDate = isThisMonth(txDate);
        else if (dateFilter === 'year') matchDate = isThisYear(txDate);
        else if (dateFilter === 'custom' && customDate) {
          matchDate = isSameDay(txDate, parseISO(customDate));
        }
      }

      const matchProvider = providerFilter === 'all' || normalizeProviderName(tx.provider || '') === providerFilter;

      return matchType && matchSearch && matchDate && matchProvider;
    });
  }, [filterType, searchQuery, dateFilter, customDate, providerFilter]) || [];

  const handleDeleteClick = (e: React.MouseEvent, id?: number) => {
    e.stopPropagation();
    if (id) {
      setDeleteId(id);
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await db.transactions.delete(deleteId);
      setDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteId(null);
  };

  const totals = transactions.reduce((acc, tx) => {
    const cat = tx.category.toLowerCase();
    if (cat === 'withdrawal') acc.withdrawals += tx.amount;
    else if (cat === 'deposit') acc.deposits += tx.amount;
    else if (cat === 'airtime_bought') acc.airtimeBought += tx.amount;
    else if (cat === 'airtime_sold') acc.airtimeSold += tx.amount;
    else if (cat === 'airtime') acc.airtimeBought += tx.amount;
    else if (cat === 'commission') acc.commission += tx.amount;
    else if (tx.type === 'income') acc.received += tx.amount;
    else acc.sent += tx.amount;
    return acc;
  }, { deposits: 0, withdrawals: 0, airtimeBought: 0, airtimeSold: 0, received: 0, sent: 0, commission: 0 });

  const generateAndDownloadPDF = async () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Transaction Report', 14, 22);
    
    // Add subtitle with filters
    doc.setFontSize(11);
    doc.setTextColor(100);
    const filterText = `Date: ${dateFilter === 'custom' && customDate ? customDate : dateFilter} | Type: ${filterType}`;
    doc.text(filterText, 14, 30);

    // Add totals summary
    doc.setFontSize(10);
    doc.text(`Deposits: ${formatCurrency(totals.deposits)} | Withdrawals: ${formatCurrency(totals.withdrawals)}`, 14, 38);
    doc.text(`Received: ${formatCurrency(totals.received)} | Sent: ${formatCurrency(totals.sent)} | Airtime Bought: ${formatCurrency(totals.airtimeBought)}`, 14, 44);
    doc.text(`Airtime Sold: ${formatCurrency(totals.airtimeSold)} | Commission: ${formatCurrency(totals.commission)}`, 14, 50);

    // Prepare table data
    const tableData = transactions.map(tx => [
      format(parseISO(tx.date), 'MMM d, yyyy'),
      tx.smsTime || '-',
      tx.category.replace('_', ' '),
      tx.senderReceiverName || '-',
      tx.tid || '-',
      (tx.type === 'income' ? '+' : '-') + formatCurrency(tx.amount)
    ]);

    autoTable(doc, {
      startY: 56,
      head: [['Date', 'Time', 'Category', 'Name', 'TID', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }, // blue-600
      styles: { fontSize: 9 },
    });

    const fileName = `transactions_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        const result = await PDFExport.saveBase64PDF({
          data: pdfBase64,
          filename: fileName
        });

        if (result && result.success) {
          setTimeout(() => {
            if (confirm('Report saved to Downloads. Would you like to open it?')) {
              PDFExport.openPDF({ uri: result.uri })
                .catch((e) => console.error(e))
                .finally(() => {
                  if (needsAdForPdf) forceAd(() => {});
                });
            } else {
              if (needsAdForPdf) forceAd(() => {});
            }
          }, 500);
        }
      } catch (error: any) {
        if (error.message !== 'Share canceled') {
          console.error('Error saving PDF:', error);
          alert('Failed to save PDF. Please try again.');
        }
      }
    } else {
      doc.save(fileName);
      if (needsAdForPdf) forceAd(() => {});
    }
  };

  const handleDownloadPDF = () => {
    if (needsAdForPdf) {
      forceAd(generateAndDownloadPDF);
    } else {
      generateAndDownloadPDF();
    }
  };

  // Group by date
  const groupedTransactions = transactions.reduce((groups, tx) => {
    const dateStr = format(parseISO(tx.date), 'yyyy-MM-dd');
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(tx);
    return groups;
  }, {} as Record<string, typeof transactions>);

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] transition-colors">
      <div className="bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{t('history.title')}</h1>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span>{t('history.download_report')}</span>
          </button>
        </div>
        
        {/* Search and Filter */}
        <div className="flex flex-col space-y-3 mb-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input 
                type="text" 
                placeholder={t('history.search_placeholder', 'Search transactions...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg py-2 pl-9 pr-4 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative shrink-0">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="appearance-none bg-gray-100 dark:bg-gray-800 border-none rounded-lg py-2 pl-3 pr-8 text-sm text-gray-600 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 h-full font-medium"
              >
                <option value="all">{t('history.filter_all', 'All Types')}</option>
                <option value="income">{t('history.filter_income', 'Income')}</option>
                <option value="expense">{t('history.filter_expense', 'Expense')}</option>
              </select>
              <Filter className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            </div>
          </div>
          
          {/* Provider Filter */}
          {availableProviders.length > 0 && (
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setProviderFilter('all')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                  providerFilter === 'all'
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                )}
              >
                All Lines
              </button>
              {availableProviders.map(provider => (
                <button
                  key={provider}
                  onClick={() => setProviderFilter(provider)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                    providerFilter === provider
                      ? "bg-purple-600 border-purple-600 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                >
                  {provider}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date Filters & Calendar */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide items-center">
          <div className="relative shrink-0 flex items-center">
            <div className={cn(
              "flex items-center space-x-1.5 text-xs rounded-full px-3 py-1.5 border transition-colors h-[30px]",
              dateFilter === 'custom'
                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}>
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium whitespace-nowrap">
                {customDate ? format(parseISO(customDate), 'MMM d, yyyy') : t('reports.select_date', 'Select Date')}
              </span>
            </div>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                if (e.target.value) setDateFilter('custom');
                else setDateFilter('all');
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 shrink-0 mx-1"></div>
          {DATE_FILTERS.map((df) => (
            <button
              key={df.id}
              onClick={() => {
                setDateFilter(df.id);
                if (df.id !== 'custom') setCustomDate('');
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                dateFilter === df.id
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-3 flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl p-3 min-w-[110px] shrink-0">
            <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold mb-1 uppercase tracking-wider">{t('history.deposits')}</p>
            <p className="text-sm font-bold text-green-700 dark:text-green-300">{formatCurrency(totals.deposits)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-3 min-w-[110px] shrink-0">
            <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mb-1 uppercase tracking-wider">{t('history.withdrawals')}</p>
            <p className="text-sm font-bold text-red-700 dark:text-red-300">{formatCurrency(totals.withdrawals)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3 min-w-[110px] shrink-0">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mb-1 uppercase tracking-wider">{t('history.received')}</p>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totals.received)}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl p-3 min-w-[110px] shrink-0">
            <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold mb-1 uppercase tracking-wider">{t('history.sent')}</p>
            <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{formatCurrency(totals.sent)}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3 min-w-[110px] shrink-0">
            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold mb-1 uppercase tracking-wider">{t('history.airtime_bought')}</p>
            <p className="text-sm font-bold text-purple-700 dark:text-purple-300">{formatCurrency(totals.airtimeBought)}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3 min-w-[110px] shrink-0">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mb-1 uppercase tracking-wider">{t('history.airtime_sold')}</p>
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(totals.airtimeSold)}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 min-w-[110px] shrink-0">
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1 uppercase tracking-wider">{t('history.commission')}</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totals.commission)}</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {t('reports.no_transactions', 'No transactions found.')}
          </div>
        ) : (
          Object.keys(groupedTransactions).sort().reverse().map((dateStr, index) => (
            <React.Fragment key={dateStr}>
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                  {format(parseISO(dateStr), 'MMMM d, yyyy')}
                </h3>
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800 transition-colors">
                  {groupedTransactions[dateStr].map(tx => (
                    <div 
                      key={tx.id} 
                      onClick={() => triggerAction(() => navigate(`/transaction/${tx.id}`))}
                      className="p-4 flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          tx.type === 'income' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        )}>
                          {tx.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white capitalize">{tx.category.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 max-w-[200px] mt-0.5">
                            {tx.rawMessage || tx.note || (tx.senderReceiverName ? `${tx.type === 'income' ? 'From' : 'To'} ${tx.senderReceiverName}` : '')}
                          </p>
                          {tx.tid && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">TID: {tx.tid}</p>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col items-end">
                          <p className={cn(
                            "font-semibold text-sm",
                            tx.type === 'income' ? "text-green-600 dark:text-green-400" : "text-gray-800 dark:text-gray-200"
                          )}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                          </p>
                          {tx.smsTime && <span className="text-[10px] text-gray-400 dark:text-gray-500">{tx.smsTime}</span>}
                        </div>
                        <button 
                          onClick={(e) => handleDeleteClick(e, tx.id)}
                          className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </React.Fragment>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('history.confirm_delete_title', 'Delete Transaction')}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {t('history.confirm_delete_body', 'Are you sure you want to delete this transaction? This action cannot be undone.')}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t('history.cancel', 'Cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                {t('history.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
