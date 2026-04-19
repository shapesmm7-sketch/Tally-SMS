import { Capacitor } from '@capacitor/core';
import { db } from './db';
import { parseMoMoSMS, parseTransactionDate } from './smsParser';
import { requestSmsPermissions } from './smsDetector';

// Declare the cordova SMS plugin interface
declare global {
  interface Window {
    SMS?: {
      hasPermission: (success: (hasPermission: boolean) => void, error: (err: any) => void) => void;
      requestPermission: (success: () => void, error: (err: any) => void) => void;
      listSMS: (filter: any, success: (data: any[]) => void, error: (err: any) => void) => void;
    };
  }
}

export async function scanAndImportSMS(
  onProgress: (msg: string) => void,
  onComplete: (count: number) => void,
  onError: (err: string) => void
) {
  if (!Capacitor.isNativePlatform()) {
    onError('Auto-scan is only available on Android. Please use the manual paste option on the web.');
    return;
  }

  const smsPlugin = (window as any).SMS || (window as any).sms || (window as any).cordova?.plugins?.sms;

  if (!smsPlugin) {
    onError('SMS plugin not found. Make sure the app is built correctly with Cordova SMS plugin.');
    return;
  }

  onProgress('Checking permissions...');

  const hasPerm = await requestSmsPermissions();
  if (!hasPerm) {
    onError('SMS permission denied. Please enable it in your phone settings to scan messages.');
    return;
  }

  onProgress('Syncing transactions...');

  // Fetch last 100 messages to avoid freezing the app
  const filter = {
    box: 'inbox',
    indexFrom: 0,
    maxCount: 200,
  };

  if (typeof smsPlugin.listSMS !== 'function') {
    onError('SMS reading is not supported by the current plugin.');
    return;
  }

  smsPlugin.listSMS(
    filter,
    async (messages) => {
      onProgress(`Found ${messages.length} messages. Analyzing...`);
      
      let newTransactionsCount = 0;
      
      // Get existing transaction IDs to avoid duplicates
      const existingTxs = await db.transactions.toArray();
      const existingTids = new Set(existingTxs.map(tx => tx.tid).filter(Boolean));

      for (const msg of messages) {
        // Basic filter to only parse likely financial messages
        const body = (msg.body || '').toLowerCase();
        
        const keywords = [
          'received', 'sent', 'withdrawn', 'withdraw', 'airtime', 'deposit', 
          'payment', 'paid', 'confirmed', 'transfer', 'credited', 'debited', 
          'recharged', 'cash', 'transid', 'txn:', 'ref:', 'balance',
          'ugx', 'kes', 'ghs', 'rwf', 'tzs', 'zar', 'ngn', 'xof', 'xaf', 
          'mzn', 'bwp', 'zmw', 'eur', 'usd', 'gbp'
        ];

        if (!keywords.some(k => body.includes(k))) {
          continue;
        }

        const parsed = parseMoMoSMS(body, msg.address);
        
        if (parsed && parsed.transaction_id) {
          // Check if we already have this transaction
          if (!existingTids.has(parsed.transaction_id)) {
            const type = parsed.transaction_type === 'deposit' ? 'income' : 'expense';
            let note = '';
            if (parsed.sender_name) note = `From ${parsed.sender_name}`;
            else if (parsed.receiver_name) note = `To ${parsed.receiver_name}`;

            const categoryName = parsed.transaction_type.charAt(0).toUpperCase() + parsed.transaction_type.slice(1);

            // Use the parsed SMS date if available, otherwise fallback to message timestamp
            let txDate = new Date().toISOString();
            if (parsed.date) {
              txDate = parseTransactionDate(parsed.date, parsed.time);
            } else if (msg.date) {
              txDate = new Date(msg.date).toISOString();
            }

            await db.transactions.add({
              amount: parsed.amount || 0,
              type,
              category: categoryName,
              note,
              date: txDate,
              createdAt: new Date().toISOString(),
              tid: parsed.transaction_id,
              senderReceiverName: parsed.sender_name || parsed.receiver_name || undefined,
              smsDate: parsed.date || undefined,
              smsTime: parsed.time || undefined,
              currency: parsed.currency || undefined,
              phoneNumber: parsed.phone_number || undefined,
              balance: parsed.balance || undefined,
              fee: parsed.fee || undefined,
              provider: parsed.provider || undefined,
              rawMessage: parsed.raw_message || body
            });
            
            existingTids.add(parsed.transaction_id);
            newTransactionsCount++;
          }
        }
      }

      onComplete(newTransactionsCount);
    },
    (err) => {
      onError('Failed to read SMS messages: ' + JSON.stringify(err));
    }
  );
}
