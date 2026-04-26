import { registerPlugin, Capacitor, type PermissionState } from '@capacitor/core';
import { db } from './db';
import { parseMoMoSMS, parseTransactionDate } from './smsParser';

export interface PermissionStatus {
  sms: PermissionState;
}

export interface SMSDetectionPlugin {
  getPendingSMS(): Promise<{ messages: Array<{ sender: string; body: string; timestamp: number }> }>;
  isBatteryOptimizationDisabled(): Promise<{ disabled: boolean }>;
  openBatteryOptimizationSettings(): Promise<void>;
  openAppSettings(): Promise<void>;
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
  checkSmsPermissionNative(): Promise<{ granted: boolean }>;
}

const SMSDetection = registerPlugin<SMSDetectionPlugin>('SMSDetection');

export async function checkSmsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const status = await SMSDetection.checkSmsPermissionNative();
    return status.granted;
  } catch (e) {
    console.error('Error with native check, falling back to plugin', e);
    try {
      const status = await SMSDetection.checkPermissions();
      return status.sms === 'granted';
    } catch (err) {
      return false;
    }
  }
}

export async function requestSmsPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  try {
    let status = await SMSDetection.checkPermissions();
    
    if (status.sms === 'granted') {
      return true;
    }

    if (status.sms === 'denied') {
      // In Capacitor 3+, 'denied' often means the user has checked "Never ask again"
      // However, first we try to request
      status = await SMSDetection.requestPermissions();
    } else if (status.sms === 'prompt' || status.sms === 'prompt-with-rationale') {
      status = await SMSDetection.requestPermissions();
    }

    return status.sms === 'granted';
  } catch (e) {
    console.error('Error requesting permissions:', e);
    return false;
  }
}

export async function syncPendingSMS(limit: number = Infinity): Promise<{ count: number; limitReached: boolean }> {
  if (!Capacitor.isNativePlatform()) {
    return { count: 0, limitReached: false };
  }
  
  try {
    const { messages } = await SMSDetection.getPendingSMS();
    if (!messages || messages.length === 0) {
      return { count: 0, limitReached: false };
    }

    if (limit <= 0) {
      // There are pending messages but the limit is already 0
      return { count: 0, limitReached: true };
    }

    console.log(`Processing up to ${limit} from ${messages.length} pending SMS messages...`);
    let count = 0;
    
    const existingTxs = await db.transactions.toArray();
    const existingTids = new Set(existingTxs.map(tx => tx.tid).filter(Boolean));
    let hasMoreUnprocessed = false;

    for (const msg of messages) {
      if (count >= limit) {
        hasMoreUnprocessed = true;
        break; // ENFORCE LIMIT
      }

      const parsed = parseMoMoSMS(msg.body, msg.sender);
      // Only add if not already in DB
      if (parsed && parsed.transaction_id) {
        if (!existingTids.has(parsed.transaction_id)) {
          const txDate = parseTransactionDate(parsed.date, parsed.time);
          
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
            smsTime: parsed.time || undefined,
            currency: parsed.currency || undefined,
            phoneNumber: parsed.phone_number || undefined,
            balance: parsed.balance || undefined,
            fee: parsed.fee || undefined,
            provider: parsed.provider || undefined,
            rawMessage: parsed.raw_message
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
              updates.rawMessage = parsed.raw_message || msg.body;
            }
            
            if (Object.keys(updates).length > 0) {
              await db.transactions.update(existingTx.id, updates);
              if (updates.category) existingTx.category = updates.category;
            }
          }
        }
      } else if (parsed && !parsed.transaction_id) {
        // Fallback if no TID (less common for mobile money)
        const txDate = parseTransactionDate(parsed.date, parsed.time);
        await db.transactions.add({
          amount: parsed.amount || 0,
          type: parsed.transaction_type === 'deposit' ? 'income' : 'expense',
          category: parsed.transaction_type.charAt(0).toUpperCase() + parsed.transaction_type.slice(1),
          note: parsed.sender_name ? `From ${parsed.sender_name}` : (parsed.receiver_name ? `To ${parsed.receiver_name}` : ''),
          date: txDate,
          createdAt: new Date().toISOString(),
          senderReceiverName: parsed.sender_name || parsed.receiver_name || undefined,
          rawMessage: parsed.raw_message
        });
        count++;
      }
    }
    return { count, limitReached: hasMoreUnprocessed };
  } catch (e) {
    console.error('Error syncing SMS:', e);
  }
  return { count: 0, limitReached: false };
}

export default SMSDetection;
