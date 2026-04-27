import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { formatCurrency, cn } from '../lib/utils';
import { ArrowDownRight, ArrowUpRight, Smartphone, ArrowRightLeft, Activity, Send, Download, Calendar, FileText, Plus, X, Landmark } from 'lucide-react';
import { isToday, isYesterday, isThisWeek, isThisMonth, isThisYear, parseISO, isSameDay, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import PDFExport from '../lib/pdfExport';

import { useTranslation } from 'react-i18next';
import { useAccessControl } from '../hooks/useAccessControl';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { normalizeProviderName } from '../lib/smsParser';

export default function Reports() {
  const { t } = useTranslation();
  
  type Timeframe = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';

  const TIMEFRAMES: { id: Timeframe; label: string }[] = [
    { id: 'today', label: t('reports.today') },
    { id: 'yesterday', label: t('reports.yesterday') },
    { id: 'week', label: t('reports.this_week') },
    { id: 'month', label: t('reports.this_month') },
    { id: 'year', label: t('reports.this_year') },
    { id: 'all', label: t('reports.all_time') },
  ];

  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [customDate, setCustomDate] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [manualCommissionAmount, setManualCommissionAmount] = useState('');
  const [manualCommissionDate, setManualCommissionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualCommissionProvider, setManualCommissionProvider] = useState('');
  const { needsAdForPdf } = useAccessControl();
  const { forceAd } = useInterstitialAd();
  
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const availableProviders = useMemo(() => {
    const providers = new Set(
      transactions.map(tx => normalizeProviderName(tx.provider || '')).filter(Boolean)
    );
    return Array.from(providers) as string[];
  }, [transactions]);

  const { deposits, withdrawals, airtimeBought, airtimeSold, received, sent, totalVolume, commission, filtered } = useMemo(() => {
    let filtered = transactions;
    
    if (providerFilter !== 'all') {
      filtered = filtered.filter(tx => normalizeProviderName(tx.provider || '') === providerFilter);
    }
    
    if (timeframe !== 'all') {
      filtered = filtered.filter(tx => {
        const txDate = parseISO(tx.date);
        if (timeframe === 'today') return isToday(txDate);
        if (timeframe === 'yesterday') return isYesterday(txDate);
        if (timeframe === 'week') return isThisWeek(txDate, { weekStartsOn: 1 }); // Assuming week starts on Monday, or use default
        if (timeframe === 'month') return isThisMonth(txDate);
        if (timeframe === 'year') return isThisYear(txDate);
        if (timeframe === 'custom' && customDate) {
          return isSameDay(txDate, parseISO(customDate));
        }
        return true;
      });
    }

    let deposits = 0;
    let withdrawals = 0;
    let airtimeBought = 0;
    let airtimeSold = 0;
    let received = 0;
    let sent = 0;
    let totalVolume = 0;
    let commission = 0;

    filtered.forEach(tx => {
      totalVolume += tx.amount;
      const cat = tx.category.toLowerCase();
      if (cat === 'withdrawal') withdrawals += tx.amount;
      else if (cat === 'deposit') deposits += tx.amount;
      else if (cat === 'airtime_bought') airtimeBought += tx.amount;
      else if (cat === 'airtime_sold') airtimeSold += tx.amount;
      else if (cat === 'airtime') airtimeBought += tx.amount; // Fallback for old ones
      else if (cat === 'commission') commission += tx.amount;
      else if (tx.type === 'income') received += tx.amount;
      else sent += tx.amount;
    });

    return { deposits, withdrawals, airtimeBought, airtimeSold, received, sent, totalVolume, commission, filtered };
  }, [transactions, timeframe, customDate, providerFilter]);

  const generateAndDownloadPDF = async () => {
    // Extract user friendly time period title
    let reportPeriodText = "All Time";
    if (timeframe === 'custom' && customDate) {
      reportPeriodText = customDate;
    } else if (timeframe !== 'all') {
      const selectedFrame = TIMEFRAMES.find(t => t.id === timeframe);
      if (selectedFrame) reportPeriodText = selectedFrame.label;
    }
    
    const formattedTitle = `MoMo Tracker Reports ${reportPeriodText}`;
    // Provide a file name without spaces
    const safeFilenameStr = `momo_tracker_reports_${reportPeriodText.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}`;

    if (Capacitor.isNativePlatform()) {
      // Use the pure Native Android download
      try {
        const mapped = filtered.map(tx => ({
          date: format(parseISO(tx.date), 'MMM d, yyyy'),
          type: tx.type === 'income' ? 'Income' : 'Expense',
          category: tx.category.replace('_', ' '),
          amount: (tx.type === 'income' ? '+' : '-') + formatCurrency(tx.amount)
        }));
        
        const result = await PDFExport.generateAndSavePDF({
          title: formattedTitle,
          filename: `${safeFilenameStr}.pdf`,
          transactions: mapped
        });

        if (result.success) {
          setTimeout(() => {
            if (confirm("Report saved to Downloads. Would you like to open it?")) {
              PDFExport.openPDF({ uri: result.uri }).catch(e => console.error(e));
            }
          }, 500);
        }
      } catch (error: any) {
        console.error('Error saving via MediaStore PDF:', error);
        alert('Failed to save report: ' + error.message);
      }
      return;
    }

    // Web Fallback: Use jsPDF
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(formattedTitle, 14, 22);
    
    // Add subtitle with filters
    doc.setFontSize(11);
    doc.setTextColor(100);
    const filterText = `Period: ${timeframe === 'custom' && customDate ? customDate : timeframe} | Line: ${providerFilter === 'all' ? 'All' : providerFilter}`;
    doc.text(filterText, 14, 30);

    // Add totals summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Volume: ${formatCurrency(totalVolume)}`, 14, 42);
    doc.text(`Deposits: ${formatCurrency(deposits)}`, 14, 50);
    doc.text(`Withdrawals: ${formatCurrency(withdrawals)}`, 14, 58);
    doc.text(`Received: ${formatCurrency(received)}`, 14, 66);
    doc.text(`Sent/Paid: ${formatCurrency(sent)}`, 14, 74);
    doc.text(`Airtime Bought: ${formatCurrency(airtimeBought)}`, 14, 82);
    doc.text(`Airtime Sold: ${formatCurrency(airtimeSold)}`, 14, 90);
    doc.text(`Total Commission: ${formatCurrency(commission)}`, 14, 98);

    // Prepare table data for transactions in this period
    const tableData = filtered.map(tx => [
      format(parseISO(tx.date), 'MMM d, yyyy'),
      tx.type === 'income' ? 'Income' : 'Expense',
      tx.category.replace('_', ' '),
      tx.senderReceiverName || '-',
      (tx.type === 'income' ? '+' : '-') + formatCurrency(tx.amount)
    ]);

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: 106,
        head: [['Date', 'Type', 'Category', 'Name', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }, // blue-600
        styles: { fontSize: 9 },
      });
    }

    const fileName = `${safeFilenameStr}.pdf`;
    doc.save(fileName);
  };

  const handleDownloadPDF = () => {
    if (needsAdForPdf) {
      forceAd(generateAndDownloadPDF);
    } else {
      generateAndDownloadPDF();
    }
  };

  const handleAddCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(manualCommissionAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Use selected date with current time, or just selected date ISO
    const selectedDate = manualCommissionDate ? new Date(manualCommissionDate).toISOString() : new Date().toISOString();

    await db.transactions.add({
      amount,
      type: 'income',
      category: 'Commission',
      note: 'Manual Commission Entry',
      date: selectedDate,
      createdAt: new Date().toISOString(),
      provider: normalizeProviderName(manualCommissionProvider) || undefined,
    });

    setManualCommissionAmount('');
    setShowCommissionModal(false);
  };

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] transition-colors">
      <div className="bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{t('reports.title')}</h1>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            <span>{t('reports.download_report')}</span>
          </button>
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide items-center mb-1">
          <div className="relative shrink-0 flex items-center">
            <div className={cn(
              "flex items-center space-x-1.5 text-sm rounded-xl px-4 py-2 font-medium transition-all",
              timeframe === 'custom'
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}>
              <Calendar className="w-4 h-4" />
              <span className="whitespace-nowrap">
                {customDate && timeframe === 'custom' ? format(parseISO(customDate), 'MMM d, yyyy') : t('reports.select_date')}
              </span>
            </div>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                if (e.target.value) setTimeframe('custom');
                else setTimeframe('all');
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 shrink-0 mx-1"></div>
          {TIMEFRAMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTimeframe(t.id);
                if (t.id !== 'custom') setCustomDate('');
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                timeframe === t.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Provider Filter */}
        {availableProviders.length > 0 && (
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide items-center pt-2">
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

      <div className="p-6 space-y-4">
        {/* Total Volume Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-md text-white mb-2">
          <div className="flex items-center mb-2 opacity-90">
            <Activity className="w-5 h-5 mr-2" />
            <h2 className="text-sm font-medium">{t('reports.total_volume')}</h2>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalVolume)}</p>
          <p className="text-blue-100 text-xs mt-2">{t('reports.total_volume_desc')}</p>
        </div>

        {/* Deposits Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-green-100 dark:border-green-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-4 shrink-0">
            <ArrowDownRight className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports.total_deposits')}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(deposits)}</p>
          </div>
        </div>

        {/* Withdrawals Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-red-100 dark:border-red-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-4 shrink-0">
            <ArrowUpRight className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports.total_withdrawals')}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(withdrawals)}</p>
          </div>
        </div>

        {/* Received Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-blue-100 dark:border-blue-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4 shrink-0">
            <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports.total_received')}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(received)}</p>
          </div>
        </div>

        {/* Sent Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-orange-100 dark:border-orange-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-4 shrink-0">
            <Send className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports.total_sent')}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(sent)}</p>
          </div>
        </div>

        {/* Airtime Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-purple-100 dark:border-purple-900/30 flex flex-col transition-colors">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-2 shrink-0">
                <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('reports.airtime_bought')}</p>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white mt-auto">{formatCurrency(airtimeBought)}</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-purple-100 dark:border-purple-900/30 flex flex-col transition-colors">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-2 shrink-0">
                <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('reports.airtime_sold')}</p>
            </div>
            <p className="text-lg font-bold text-gray-800 dark:text-white mt-auto">{formatCurrency(airtimeSold)}</p>
          </div>
        </div>

        {/* Commission Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-4 shrink-0">
            <Landmark className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('reports.total_commission', 'Total Commission')}</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(commission)}</p>
              <button 
                onClick={() => setShowCommissionModal(true)}
                className="flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {t('reports.add_commission', 'Add Commission')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Commission Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 relative">
              <button 
                onClick={() => setShowCommissionModal(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mr-3 shrink-0">
                  <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Log Commission</h3>
              </div>
              
              <form onSubmit={handleAddCommission} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Commission Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={manualCommissionAmount}
                      onChange={(e) => setManualCommissionAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 text-lg font-bold"
                      inputMode="decimal"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date Earned</label>
                  <input
                    type="date"
                    value={manualCommissionDate}
                    onChange={(e) => setManualCommissionDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mobile Money Provider</label>
                  <input
                    type="text"
                    value={manualCommissionProvider}
                    onChange={(e) => setManualCommissionProvider(e.target.value)}
                    placeholder="e.g. MTN, Airtel, M-Pesa"
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-3 px-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>

                <div className="pt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                    If your mobile network doesn't send an SMS when you earn a commission, please check the commission balance directly on your phone and enter it here to save it.
                  </p>
                  <button 
                    type="submit"
                    disabled={!manualCommissionAmount || isNaN(parseFloat(manualCommissionAmount)) || parseFloat(manualCommissionAmount) <= 0}
                    className="w-full bg-emerald-600 dark:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 dark:hover:bg-emerald-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Commission
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
