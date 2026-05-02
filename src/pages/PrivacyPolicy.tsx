import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="flex flex-col min-h-full bg-[var(--background)] transition-colors">
      <div className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold ml-2 text-gray-800 dark:text-white">Privacy Policy</h1>
      </div>

      <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-gray-900 shadow-sm min-h-screen transition-colors">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Privacy Policy for Momo Tracker</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Effective Date: {today}</p>
          </div>
        </div>

        <div className="prose prose-sm text-gray-600 dark:text-gray-300 space-y-6">
          <p>
            Momo Tracker ("we", "our", or "us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our mobile application.
          </p>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Information We Collect</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">a) User-Provided Information</h4>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Mobile money messages that you copy and paste into the app</li>
                  <li>Data extracted from messages (e.g., transaction ID, sender/receiver name, amount, date)</li>
                  <li>Country selection (to display relevant currency)</li>
                  <li>4-digit PIN (used to secure your account locally)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">b) Automatically Processed Information</h4>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>SMS or message content only when you enable auto-detection</li>
                  <li>The app analyzes messages to extract transaction details, but does not access unrelated messages</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. How We Use Your Information</h3>
            <p>We use your information to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Automatically detect and organize mobile money transactions</li>
              <li>Display transaction history and reports</li>
              <li>Show correct currencies based on your selected country</li>
              <li>Secure your data using your 4-digit PIN</li>
              <li>Improve app performance and user experience</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Data Storage and Security</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your data is stored locally on your device unless otherwise stated</li>
              <li>We do not store your personal financial data on external servers</li>
              <li>Your 4-digit PIN helps protect unauthorized access</li>
              <li>We implement reasonable security measures to protect your information</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Data Control and Deletion</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>You can delete your transaction data at any time directly within the app</li>
              <li>Once deleted, the data is permanently removed and cannot be recovered</li>
              <li>You have full control over the information stored in the app</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">5. Permissions We May Request</h3>
            <p>To provide our services, the app may request:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access to messages (for auto-detection feature only)</li>
              <li>Storage access (to save and manage your data)</li>
            </ul>
            <p className="mt-2 text-sm italic">These permissions are only used to enable core app functionality.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">6. Data Sharing</h3>
            <p>We do not:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Sell your data</li>
              <li>Share your personal or financial information with third parties</li>
            </ul>
            <p className="mt-2">Your data remains private and under your control.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">7. No Affiliation with MTN MoMo</h3>
            <p><strong>Momo Tracker is an independent application and is NOT affiliated, associated, authorized, endorsed by, or in any way officially connected with MTN Group Limited, MTN MoMo, or any of its subsidiaries or its affiliates.</strong></p>
            <p className="mt-2">The official MTN MoMo application can be found on the Google Play Store. The name "MTN MoMo" as well as related names, marks, emblems and images are registered trademarks of their respective owners. We do not collect, process, or transmit data to MTN Group Limited. Momo Tracker operates independently as a personal utility for users to track their own SMS messages.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">8. Children’s Privacy</h3>
            <p>Momo Tracker is not intended for children under 13. We do not knowingly collect data from children.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">9. Changes to This Privacy Policy</h3>
            <p>We may update this Privacy Policy from time to time. Any changes will be posted within the app with an updated effective date.</p>
          </section>

          <section className="pb-12">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">10. Contact Us</h3>
            <p>If you have any questions or concerns about this Privacy Policy, you can contact us at:</p>
            <p className="mt-2 font-medium text-blue-600 dark:text-blue-400">Email: shapesmm7@gmail.com</p>
          </section>
        </div>
      </div>
    </div>
  );
}
