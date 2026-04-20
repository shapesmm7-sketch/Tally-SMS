import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { formatCurrency, cn } from '../lib/utils';
import { ArrowDownRight, ArrowUpRight, Smartphone, ArrowRightLeft, Activity, Send, Download, Calendar, FileText } from 'lucide-react';
import { isToday, isYesterday, isThisWeek, isThisMonth, isThisYear, parseISO, isSameDay, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

type Timeframe = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

export default function Reports() {
  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [customDate, setCustomDate] = useState('');
  
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const { deposits, withdrawals, airtime, received, sent, totalVolume, filtered } = useMemo(() => {
    let filtered = transactions;
    
    if (timeframe !== 'all') {
      filtered = transactions.filter(tx => {
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
    let airtime = 0;
    let received = 0;
    let sent = 0;
    let totalVolume = 0;

    filtered.forEach(tx => {
      totalVolume += tx.amount;
      const cat = tx.category.toLowerCase();
      if (cat === 'withdrawal') withdrawals += tx.amount;
      else if (cat === 'deposit') deposits += tx.amount;
      else if (cat === 'airtime') airtime += tx.amount;
      else if (tx.type === 'income') received += tx.amount;
      else sent += tx.amount;
    });

    return { deposits, withdrawals, airtime, received, sent, totalVolume, filtered };
  }, [transactions, timeframe]);

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Financial Report Summary', 14, 22);
    
    // Add subtitle with filters
    doc.setFontSize(11);
    doc.setTextColor(100);
    const filterText = `Period: ${timeframe === 'custom' && customDate ? customDate : timeframe}`;
    doc.text(filterText, 14, 30);

    // Add totals summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Volume: ${formatCurrency(totalVolume)}`, 14, 42);
    doc.text(`Deposits: ${formatCurrency(deposits)}`, 14, 50);
    doc.text(`Withdrawals: ${formatCurrency(withdrawals)}`, 14, 58);
    doc.text(`Received: ${formatCurrency(received)}`, 14, 66);
    doc.text(`Sent/Paid: ${formatCurrency(sent)}`, 14, 74);
    doc.text(`Airtime: ${formatCurrency(airtime)}`, 14, 82);

    // Prepare table data for transactions in this period
    const tableData = filtered.map(tx => [
      format(parseISO(tx.date), 'MMM d, yyyy'),
      tx.type === 'income' ? 'Income' : 'Expense',
      tx.category,
      tx.senderReceiverName || '-',
      (tx.type === 'income' ? '+' : '-') + formatCurrency(tx.amount)
    ]);

    if (tableData.length > 0) {
      autoTable(doc, {
        startY: 90,
        head: [['Date', 'Type', 'Category', 'Name', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }, // blue-600
        styles: { fontSize: 9 },
      });
    }

    const fileName = `report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: pdfBase64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Financial Report',
          text: 'Here is your financial report.',
          files: [result.uri],
          dialogTitle: 'Share or Save PDF',
        });
      } catch (error: any) {
        if (error.message !== 'Share canceled') {
          console.error('Error saving or sharing PDF:', error);
          alert('Failed to save or share PDF. Please try again.');
        }
      }
    } else {
      doc.save(fileName);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] transition-colors">
      <div className="bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Reports</h1>
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            <span>Download Report</span>
          </button>
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide items-center">
          <div className="relative shrink-0 flex items-center">
            <div className={cn(
              "flex items-center space-x-1.5 text-sm rounded-xl px-4 py-2 font-medium transition-all",
              timeframe === 'custom'
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}>
              <Calendar className="w-4 h-4" />
              <span className="whitespace-nowrap">
                {customDate && timeframe === 'custom' ? format(parseISO(customDate), 'MMM d, yyyy') : 'Select Date'}
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
      </div>

      <div className="p-6 space-y-4">
        {/* Total Volume Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-md text-white mb-2">
          <div className="flex items-center mb-2 opacity-90">
            <Activity className="w-5 h-5 mr-2" />
            <h2 className="text-sm font-medium">Total Transaction Volume</h2>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalVolume)}</p>
          <p className="text-blue-100 text-xs mt-2">Total money moved in this period</p>
        </div>

        {/* Deposits Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-green-100 dark:border-green-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-4 shrink-0">
            <ArrowDownRight className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Deposits</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(deposits)}</p>
          </div>
        </div>

        {/* Withdrawals Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-red-100 dark:border-red-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-4 shrink-0">
            <ArrowUpRight className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Withdrawals</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(withdrawals)}</p>
          </div>
        </div>

        {/* Airtime Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-purple-100 dark:border-purple-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-4 shrink-0">
            <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Airtime</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(airtime)}</p>
          </div>
        </div>

        {/* Received Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-blue-100 dark:border-blue-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4 shrink-0">
            <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Received</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(received)}</p>
          </div>
        </div>

        {/* Sent Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-orange-100 dark:border-orange-900/30 flex items-center transition-colors">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mr-4 shrink-0">
            <Send className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Sent/Paid</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(sent)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
