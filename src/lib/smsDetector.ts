import { Capacitor } from '@capacitor/core';
import { db } from './db';
import { parseMoMoSMS, parseTransactionDate } from './smsParser';

function getSmsPlugin() {
  return (window as any).SMS || (window as any).sms || (window as any).cordova?.plugins?.sms;
}

export async function checkSmsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  return new Promise((resolve) => {
    const sms = getSmsPlugin();
    if (!sms || typeof sms.hasPermission !== 'function') {
      resolve(false);
      return;
    }
    sms.hasPermission(
      (hasPermission: boolean) => resolve(hasPermission),
      () => resolve(false)
    );
  });
}

export async function requestSmsPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  return new Promise((resolve) => {
    const sms = getSmsPlugin();
    if (!sms || typeof sms.requestPermission !== 'function') {
      resolve(false);
      return;
    }
    sms.requestPermission(
      () => resolve(true),
      () => resolve(false)
    );
  });
}

/**
 * Sync pending SMS messages.
 * Note: cordova-plugin-sms might not support battery optimization checks or native open app settings.
 */
export async function syncPendingSMS(limit: number = Infinity): Promise<{ count: number; limitReached: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    return { count: 0, limitReached: false };
  }
  
  const sms = getSmsPlugin();
  if (!sms || typeof sms.listSMS !== 'function') {
    return { count: 0, limitReached: false };
  }

  // First verify permission
  const hasPermission = await checkSmsPermission();
  if (!hasPermission) {
    return { count: 0, limitReached: false };
  }

  return new Promise((resolve) => {
    const filter = {
      box: 'inbox',
      indexFrom: 0,
      maxCount: limit === Infinity ? 200 : limit,
    };

    sms.listSMS(
      filter,
      async (messages: any[]) => {
        if (!messages || messages.length === 0) {
          resolve({ count: 0, limitReached: false });
          return;
        }

        console.log(`Processing up to ${limit} from ${messages.length} pending SMS messages...`);
        let count = 0;
        
        const existingTxs = await db.transactions.toArray();
        const existingTids = new Set(existingTxs.map(tx => tx.tid).filter(Boolean));
        let hasMoreUnprocessed = false;

        for (const msg of messages) {
          if (count >= limit) {
            hasMoreUnprocessed = true;
            break;
          }

          // Depending on cordova-plugin-sms format
          const msgBody = msg.body || '';
          const msgAddress = msg.address || msg.sender || '';

          const parsed = parseMoMoSMS(msgBody, msgAddress);
          if (parsed && parsed.transaction_id) {
            if (!existingTids.has(parsed.transaction_id)) {
              let txDate = new Date().toISOString();
              let finalTime = parsed.time;
              
              if (parsed.date) {
                txDate = parseTransactionDate(parsed.date, parsed.time);
              } else if (msg.date) {
                const d = new Date(msg.date);
                txDate = d.toISOString();
                if (!finalTime) {
                  finalTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
              }
              
              const newId = await db.transactions.add({
                amount: parsed.amount || 0,
                type: parsed.transaction_type === 'deposit' ? 'income' : 'expense',
                category: parsed.transaction_type.charAt(0).toUpperCase() + parsed.transaction_type.slice(1),
                note: parsed.sender_name ? `From ${parsed.sender_name}` : (parsed.receiver_name ? `To ${parsed.receiver_name}` : ''),
                date: txDate,
                createdAt: new Date().toISOString(),
                tid: parsed.transaction_id,
                senderReceiverName: parsed.sender_name || parsed.receiver_name || undefined,
                smsDate: parsed.date || undefined,
                smsTime: finalTime || undefined,
                currency: parsed.currency || undefined,
                phoneNumber: parsed.phone_number || undefined,
                balance: parsed.balance || undefined,
                fee: parsed.fee || undefined,
                provider: parsed.provider || undefined,
                rawMessage: parsed.raw_message || msgBody
              });
              
              existingTxs.push({
                id: newId,
                tid: parsed.transaction_id,
                category: parsed.transaction_type.charAt(0).toUpperCase() + parsed.transaction_type.slice(1),
                provider: parsed.provider,
                type: parsed.transaction_type === 'deposit' ? 'income' : 'expense'
              } as any);

              count++;
              existingTids.add(parsed.transaction_id);
            } else {
              const existingTx = existingTxs.find((t: any) => t.tid === parsed.transaction_id);
              if (existingTx && existingTx.id) {
                let updates: any = {};
                if (parsed.provider && existingTx.provider !== parsed.provider) {
                  updates.provider = parsed.provider;
                }
                if (existingTx.category === 'Payment' && parsed.transaction_type === 'sent') {
                  updates.type = 'expense';
                  updates.category = 'Sent';
                  updates.note = parsed.receiver_name ? `To ${parsed.receiver_name}` : '';
                  updates.senderReceiverName = parsed.receiver_name || undefined;
                  if (parsed.phone_number) updates.phoneNumber = parsed.phone_number;
                  updates.rawMessage = parsed.raw_message || msgBody;
                }
                
                if (Object.keys(updates).length > 0) {
                  await db.transactions.update(existingTx.id, updates);
                  if (updates.category) existingTx.category = updates.category;
                }
              }
            }
          }
        }
        resolve({ count, limitReached: hasMoreUnprocessed });
      },
      (err: any) => {
        console.error('Error syncing SMS:', err);
        resolve({ count: 0, limitReached: false });
      }
    );
  });
}

