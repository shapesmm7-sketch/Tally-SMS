import { Capacitor } from '@capacitor/core';
import { db } from './db';
import { parseMoMoSMS, parseTransactionDate } from './smsParser';
import { requestSmsPermissions } from './smsDetector';

// Declare the cordova plugins interface
declare global {
  interface Window {
    CdvPurchase?: any;
    store?: any;
    sms?: any;
    cordova?: any;
    SMS?: {
      hasPermission: (success: (hasPermission: boolean) => void, error: (err: any) => void) => void;
      requestPermission: (success: () => void, error: (err: any) => void) => void;
      listSMS: (filter: any, success: (data: any[]) => void, error: (err: any) => void) => void;
    };
  }
}

let isScanningUserInitiated = false;

export async function scanAndImportSMS(
  limit: number = Infinity,
  onProgress: (msg: string) => void,
  onComplete: (count: number) => void,
  onError: (err: string) => void
) {
  if (isScanningUserInitiated) return;

  if (!Capacitor.isNativePlatform() || limit <= 0) {
    if (limit <= 0) {
      onError('Daily scan limit reached. Upgrade to Premium for unlimited scans.');
    } else {
      onError('Auto-scan is only available on Android. Please use the manual paste option on the web.');
    }
    return;
  }
  
  isScanningUserInitiated = true;
  try {
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

    if (typeof smsPlugin.listSMS !== 'function') {
      onError('SMS reading is not supported by the current plugin.');
      return;
    }

    let allMessagesProcessed = false;
    let indexFrom = 0;
    const maxCount = 500;
    let newTransactionsCount = 0;
    
    // Get existing transaction IDs to avoid duplicates
    const existingTxs = await db.transactions.toArray();
    // Pre-compute sets and maps for faster lookups (O(1))
    const existingTidsMap = new Map();
    const existingMessagesMap = new Map();
    
    for (const tx of existingTxs) {
      if (tx.tid) {
          existingTidsMap.set(tx.tid, tx);
      }
      if (tx.rawMessage) {
          const raw = tx.rawMessage.trim().toLowerCase();
          if (!existingMessagesMap.has(raw)) existingMessagesMap.set(raw, []);
          existingMessagesMap.get(raw).push(tx);
      }
    }

    const processNextBatch = async () => {
      if (allMessagesProcessed || newTransactionsCount >= limit) {
        isScanningUserInitiated = false;
        onComplete(newTransactionsCount);
        return;
      }

      onProgress(`Scanning messages... (checked ${indexFrom})`);

      const filter = {
        box: 'inbox',
        indexFrom: indexFrom,
        maxCount: maxCount,
        sort: 'date DESC'
      };

      smsPlugin.listSMS(
        filter,
        async (messages: any[]) => {
          try {
            if (!messages || messages.length === 0) {
              allMessagesProcessed = true;
              processNextBatch();
              return;
            }

            for (const msg of messages) {
              if (newTransactionsCount >= limit) break; // ENFORCE LIMIT

              // Basic filter to only parse likely financial messages
              const body = (msg.body || '').toLowerCase();
              
              // We rely on parseMoMoSMS to validate if the SMS is a financial transaction
              // so we don't need to manually filter by keywords here.
              const parsed = parseMoMoSMS(body, msg.address);
              
              if (parsed) {
                  let txDate = new Date().toISOString();
                  let finalTime = parsed.time;
                  
                  if (parsed.date) {
                    try {
                      txDate = parseTransactionDate(parsed.date, parsed.time);
                    } catch (e) {
                      txDate = new Date().toISOString();
                    }
                  } else if (msg.date) {
                    const d = new Date(msg.date);
                    txDate = d.toISOString();
                    if (!finalTime) {
                      finalTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                  }

                  let isDuplicate = false;
                  let currentTxInDb = undefined;
                  
                  if (parsed.raw_message) {
                     const raw = parsed.raw_message.trim().toLowerCase();
                     const matchingTxs = existingMessagesMap.get(raw);
                     if (matchingTxs && matchingTxs.length > 0) {
                        const newMsgDate = new Date(txDate).getTime();
                        for (const tx of matchingTxs) {
                           const existDate = new Date(tx.date).getTime();
                           if (Math.abs(newMsgDate - existDate) < 120000) {
                               currentTxInDb = tx;
                               isDuplicate = true;
                               break;
                           }
                        }
                     }
                  }
                  
                  if (!isDuplicate && parsed.transaction_id) {
                     currentTxInDb = existingTidsMap.get(parsed.transaction_id);
                     if (currentTxInDb) isDuplicate = true;
                  }
                  
                  if (!isDuplicate) {
                  const incomeTypes = ['received', 'deposit', 'airtime_sold', 'commission'];
                  const type = incomeTypes.includes(parsed.transaction_type) ? 'income' : 'expense';
                  let note = '';
                  if (parsed.sender_name) note = `From ${parsed.sender_name}`;
                  else if (parsed.receiver_name) note = `To ${parsed.receiver_name}`;

                  const categoryMap: Record<string, string> = {
                    received: "Received",
                    deposit: "Deposit",
                    withdrawal: "Withdrawals",
                    sent: "Sent/paid",
                    airtime_bought: "Airtime bought",
                    airtime_sold: "Airtime sold",
                    commission: "Commission"
                  };
                  const categoryName = categoryMap[parsed.transaction_type] || "Other";

                    try {
                    const newId = await db.transactions.add({
                      amount: parsed.amount || 0,
                      type,
                      category: categoryName,
                      note,
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
                      rawMessage: parsed.raw_message || body
                    });
                    
                    const txObj = {
                      id: newId,
                      tid: parsed.transaction_id,
                      rawMessage: parsed.raw_message || body,
                      category: categoryName,
                      provider: parsed.provider,
                      type,
                      senderReceiverName: parsed.sender_name || parsed.receiver_name || undefined,
                      phoneNumber: parsed.phone_number || undefined,
                      smsDate: parsed.date || undefined,
                      date: txDate
                    };

                    if (parsed.transaction_id) {
                      existingTidsMap.set(parsed.transaction_id, txObj);
                    }
                    
                    if (parsed.raw_message) {
                      const raw = parsed.raw_message.trim().toLowerCase();
                      if (!existingMessagesMap.has(raw)) existingMessagesMap.set(raw, []);
                      existingMessagesMap.get(raw).push(txObj);
                    }
                    newTransactionsCount++;
                  } catch (e) {
                    console.warn('Transaction already exists', e);
                  }
                } else {
                  const existingTx = currentTxInDb;
                  if (existingTx && existingTx.id) {
                    let updates: any = {};
                    if (parsed.provider && existingTx.provider !== parsed.provider) {
                      updates.provider = parsed.provider;
                    }
                    
                    const hasMoreDetails = (!existingTx.senderReceiverName && (parsed.sender_name || parsed.receiver_name)) ||
                                           (!existingTx.phoneNumber && parsed.phone_number);
                    
                    if ((existingTx.category === 'Payment' && parsed.transaction_type === 'sent') || hasMoreDetails) {
                      const incomeTypes = ['received', 'deposit', 'airtime_sold', 'commission'];
                      updates.type = incomeTypes.includes(parsed.transaction_type) ? 'income' : 'expense';
                      
                      const categoryMap: Record<string, string> = {
                        received: "Received", deposit: "Deposit", withdrawal: "Withdrawals",
                        sent: "Sent/paid", airtime_bought: "Airtime bought", airtime_sold: "Airtime sold",
                        commission: "Commission"
                      };
                      updates.category = categoryMap[parsed.transaction_type] || "Other";
                      
                      let n = '';
                      if (parsed.sender_name) n = `From ${parsed.sender_name}`;
                      else if (parsed.receiver_name) n = `To ${parsed.receiver_name}`;
                      updates.note = n;
                      
                      updates.senderReceiverName = parsed.sender_name || parsed.receiver_name || undefined;
                      if (parsed.phone_number) updates.phoneNumber = parsed.phone_number;
                      updates.rawMessage = parsed.raw_message || body;
                    }
                    
                    if (Object.keys(updates).length > 0) {
                      await db.transactions.update(existingTx.id, updates);
                      // Also update it in the existingTxs cache so subsequent checks see the updated cache
                      if (updates.category) existingTx.category = updates.category;
                      if (updates.senderReceiverName) existingTx.senderReceiverName = updates.senderReceiverName;
                      if (updates.phoneNumber) existingTx.phoneNumber = updates.phoneNumber;
                      if (updates.rawMessage) existingTx.rawMessage = updates.rawMessage;
                    }
                  }
                }
              }
            }

            if (messages.length < maxCount) {
              allMessagesProcessed = true;
            } else {
              indexFrom += maxCount;
            }
            
            // Allow the UI to update between batches
            setTimeout(processNextBatch, 50);

          } catch (e: any) {
            isScanningUserInitiated = false;
            onError('Error analyzing messages: ' + (e.message || String(e)));
          }
        },
        (err: any) => {
          isScanningUserInitiated = false;
          onError('Failed to read SMS messages: ' + JSON.stringify(err));
        }
      );
    };

    processNextBatch();
  } catch (err: any) {
    isScanningUserInitiated = false;
    onError('Failed to start scanning: ' + (err.message || String(err)));
  }
}
