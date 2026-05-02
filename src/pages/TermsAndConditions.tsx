import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] transition-colors">
      <div className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold ml-2 text-gray-800 dark:text-white">Terms and Conditions</h1>
      </div>

      <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-gray-900 shadow-sm min-h-screen transition-colors">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Terms and Conditions for Momo Tracker</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Effective Date: 11-04-2026</p>
          </div>
        </div>

        <div className="prose prose-sm text-gray-600 dark:text-gray-300 space-y-6">
          <p>
            Welcome to Momo Tracker ("we", "our", or "us"). These Terms and Conditions govern your use of the Momo Tracker mobile application. By using the app, you agree to these terms. If you do not agree, please do not use the app.
          </p>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Use of the App</h3>
            <p>Momo Tracker is designed to help users track and manage mobile money transactions by:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Copying and pasting mobile money messages</li>
              <li>Automatically detecting transaction details from messages</li>
              <li>Organizing transaction history and reports</li>
            </ul>
            <p className="mt-2">You agree to use the app only for lawful purposes and in accordance with these Terms.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. User Responsibilities</h3>
            <p>By using Momo Tracker, you agree that:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>You are responsible for the accuracy of the data you input</li>
              <li>You will not use the app for illegal, fraudulent, or harmful activities</li>
              <li>You will keep your 4-digit PIN secure and not share it with others</li>
              <li>You are responsible for any activity that occurs within your app</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Data and Storage</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>All transaction data is stored locally on your device unless stated otherwise</li>
              <li>You are responsible for maintaining backups if needed</li>
              <li>We are not responsible for loss of data due to device issues, deletion, or app uninstallation</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Permissions</h3>
            <p>The app may request permissions such as:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access to messages (for auto-detection feature)</li>
              <li>Storage access (to save transaction data)</li>
            </ul>
            <p className="mt-2 text-sm italic">By granting these permissions, you allow the app to function as intended.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">5. No Affiliation with MTN MoMo</h3>
            <p><strong>Momo Tracker is an independent application and is NOT affiliated, associated, authorized, endorsed by, or in any way officially connected with MTN Group Limited, MTN MoMo, or any of its subsidiaries or its affiliates.</strong></p>
            <p className="mt-2">The official MTN MoMo application can be found on the Google Play Store. The name "MTN MoMo" as well as related names, marks, emblems and images are registered trademarks of their respective owners. Momo Tracker solely provides a personal utility for users to track their own SMS messages.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">6. No Financial Service</h3>
            <p>Momo Tracker is not a financial institution and does not:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide financial, banking, or payment services</li>
              <li>Process or store real money transactions</li>
            </ul>
            <p className="mt-2">The app is only a tracking and organizational tool.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">7. Limitation of Liability</h3>
            <p>To the fullest extent permitted by law:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>We are not responsible for any financial loss, incorrect data, or misinterpretation of transaction details</li>
              <li>We do not guarantee that the app will always be error-free or uninterrupted</li>
              <li>Use of the app is at your own risk</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">8. Data Deletion</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Users can delete their data at any time within the app</li>
              <li>Deleted data cannot be recovered</li>
              <li>We are not responsible for any loss resulting from data deletion</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">9. Updates and Changes</h3>
            <p>We may update or modify the app and these Terms at any time. Continued use of the app after changes means you accept the updated Terms.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">10. Termination</h3>
            <p>We reserve the right to suspend or terminate access to the app if:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>You violate these Terms</li>
              <li>You misuse the app in any way</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">11. Intellectual Property</h3>
            <p>All rights, design, and content of Momo Tracker are owned by us. You may not copy, modify, or distribute any part of the app without permission.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">12. Governing Law</h3>
            <p>These Terms shall be governed and interpreted in accordance with the laws of your country of residence.</p>
          </section>

          <section className="pb-12">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">13. Contact Us</h3>
            <p>If you have any questions about these Terms and Conditions, contact us at:</p>
            <p className="mt-2 font-medium text-blue-600 dark:text-blue-400">Email: shapesmm7@gmail.com</p>
          </section>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              By using Momo Tracker, you acknowledge that you have read, understood, and agreed to these Terms and Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
