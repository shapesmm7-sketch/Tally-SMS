import { registerPlugin, Capacitor } from '@capacitor/core';
import { db } from './db';
import { extractMultipleTransactions, parseTransactionDate } from './smsParser';

export interface OCRScannerPlugin {
  startScan(): Promise<{ completed: boolean }>;
  getPendingOCR(): Promise<{ messages: Array<{ body: string; tid: string | null; timestamp: number }> }>;
}

const OCRScanner = registerPlugin<OCRScannerPlugin>('OCRScanner');

export async function syncPendingOCR(onSuccess?: (count: number) => void): Promise<{ count: number }> {
  if (!Capacitor.isNativePlatform()) {
    return { count: 0 };
  }
  
  try {
    const { messages } = await OCRScanner.getPendingOCR();
    if (!messages || messages.length === 0) {
      return { count: 0 };
    }

    console.log(`Processing ${messages.length} pending OCR detections...`);
    let count = 0;
    
    // Get existing TIDs to avoid duplicates
    const existingTxs = await db.transactions.toArray();
    const existingTids = new Set(existingTxs.map(tx => tx.tid).filter(Boolean));

    for (const msg of messages) {
      // Use our robust parser
      const parsedList = extractMultipleTransactions(msg.body);
      
      for (const parsed of parsedList) {
        if (parsed && parsed.transaction_id && !existingTids.has(parsed.transaction_id)) {
          let txDate = new Date().toISOString();
          if (parsed.date) {
            txDate = parseTransactionDate(parsed.date, parsed.time);
          } else if (msg.timestamp) {
            txDate = new Date(msg.timestamp).toISOString();
          }
          
          await db.transactions.add({
            amount: parsed.amount || 0,
            type: parsed.transaction_type === 'deposit' ? 'income' : 'expense',
            category: parsed.transaction_type.charAt(0).toUpperCase() + parsed.transaction_type.slice(1),
            note: `Scanned from another phone`,
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
            rawMessage: parsed.raw_message || msg.body
          });
          
          count++;
          existingTids.add(parsed.transaction_id);
        }
      }
    }
    
    if (count > 0 && onSuccess) {
      onSuccess(count);
    }
    
    return { count };
  } catch (e) {
    console.error('Error syncing OCR:', e);
  }
  return { count: 0 };
}

export default OCRScanner;
