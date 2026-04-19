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
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;
}

const SMSDetection = registerPlugin<SMSDetectionPlugin>('SMSDetection');

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

export async function syncPendingSMS() {
  if (!Capacitor.isNativePlatform()) {
    return 0;
  }
  
  try {
    const { messages } = await SMSDetection.getPendingSMS();
    if (messages && messages.length > 0) {
      console.log(`Processing ${messages.length} pending SMS messages...`);
      let count = 0;
      
      const existingTxs = await db.transactions.toArray();
      const existingTids = new Set(existingTxs.map(tx => tx.tid).filter(Boolean));

      for (const msg of messages) {
        const parsed = parseMoMoSMS(msg.body);
        // Only add if not already in DB
        if (parsed && parsed.transaction_id && !existingTids.has(parsed.transaction_id)) {
          const txDate = parseTransactionDate(parsed.date, parsed.time);
          
          await db.transactions.add({
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
          count++;
          existingTids.add(parsed.transaction_id);
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
      return count;
    }
  } catch (e) {
    console.error('Error syncing SMS:', e);
  }
  return 0;
}

export default SMSDetection;
