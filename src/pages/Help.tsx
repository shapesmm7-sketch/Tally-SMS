import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Smartphone, RefreshCcw, ClipboardCopy, History, FileText, Zap, Mail } from 'lucide-react';

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] transition-colors">
      <div className="bg-white dark:bg-gray-900 px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
          Help & Guide
        </h1>
      </div>

      <div className="p-4 space-y-4 pb-12">
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-5 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            Welcome to Tally SMS! This guide explains all the features available to help you track your mobile money transactions effortlessly.
          </p>
        </div>

        {/* Feature: SMS Auto Detection */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 dark:text-white mb-2">
            <Smartphone className="w-5 h-5 mr-2 text-blue-500" />
            SMS Auto Detection
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            This is the core feature of Tally SMS. When enabled, the app continuously runs in the background and automatically catches any incoming mobile money SMS (like deposits, withdrawals, or payments) and logs them into your dashboard without you doing anything. 
          </p>
        </section>

        {/* Feature: Battery Optimization */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 dark:text-white mb-2">
            <Zap className="w-5 h-5 mr-2 text-amber-500" />
            Battery Optimization
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Android phones sometimes kill background apps to save battery. For <strong>SMS Auto Detection</strong> to be reliable, you must turn off battery optimization for Tally SMS. You can find the "Fix Now" button under the Core Features in Settings. Once disabled, Tally SMS can consistently detect messages while your screen is off.
          </p>
        </section>

        {/* Feature: Manual Scan Inbox */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 dark:text-white mb-2">
            <RefreshCcw className="w-5 h-5 mr-2 text-green-500" />
            Manual Scan Inbox
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
            If you just installed the app, you can use "Manual Scan Inbox" to search through your phone's old messages and bring previous transactions into Tally SMS.
          </p>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              Note: The main Dashboard only shows <strong>Today's</strong> transactions. If you manually scan messages from past days, you will not see them on the home screen. You can find all past transactions in the <strong>History</strong> tab!
            </p>
          </div>
        </section>

        {/* Feature: Copy and Paste */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 dark:text-white mb-2">
            <ClipboardCopy className="w-5 h-5 mr-2 text-purple-500" />
            Copy and Paste Manually
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            If an SMS wasn't caught or you don't want to grant SMS permission, you can open your messaging app, <strong>copy the message text</strong>, and open Tally SMS. Press the "+" button at the top menu or the floating plus button, tap the "Paste Message" box, and the app will intelligently extract the amount and details.
          </p>
        </section>

        {/* Feature: History & Reports */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 dark:text-white mb-2">
            <History className="w-5 h-5 mr-2 text-indigo-500" />
            History, Edit & <FileText className="inline w-5 h-5 mx-1 text-orange-500" /> Reports
          </h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <strong>History:</strong> This tab shows a complete list of all your transactions across time. You can search, filter, and view exactly where your money went.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <strong>Editing Transactions:</strong> If you made a mistake (like setting the wrong line or category), find the transaction in the History tab, tap on it to view details, and click the <strong>pencil (Edit) icon</strong>. Make the corrections and hit Save.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <strong>Reports:</strong> This screen groups your totals (Deposits, Withdrawals, Sent, etc.) by timeline. You can also download clean <strong>PDF summaries</strong> which now display the exact time alongside the date, helping you see when the transactions were made easily.
            </p>
          </div>
        </section>

        {/* Feature: Commission */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="flex items-center text-lg font-semibold text-gray-800 dark:text-white mb-2">
            <ClipboardCopy className="w-5 h-5 mr-2 text-teal-500" />
            Commission Management
          </h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <strong>Entering Commission:</strong> You can quickly add manual commission entries by going to the <strong>Reports</strong> tab and clicking the "Add Manual Commission" button. From there, select a date, choose the line/provider, input the figures, and save it.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 text-center mt-8">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Need More Help?</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            If you have any questions, feedback, or need further assistance, please contact us at:
          </p>
          <a href="mailto:shapesmm7@gmail.com" className="text-blue-600 dark:text-blue-400 font-semibold text-lg hover:underline">
            shapesmm7@gmail.com
          </a>
        </section>
      </div>
    </div>
  );
}

