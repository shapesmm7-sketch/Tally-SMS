import { registerPlugin, Capacitor, PermissionState } from '@capacitor/core';
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

function getSmsPlugin() {
  return (window as any).SMS || (window as any).sms || (window as any).cordova?.plugins?.sms;
}

export async function checkSmsPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  
  // Try native custom plugin first
  try {
    const res = await SMSDetection.checkSmsPermissionNative();
    if (res.granted) return true;
  } catch (error) {
    console.log("Custom plugin checkSmsPermissionNative not available", error);
  }

  // Fallback to standard checkPermissions
  try {
    const status = await SMSDetection.checkPermissions();
    if (status.sms === 'granted') return true;
  } catch (error) {
    console.log("Custom plugin checkPermissions not available", error);
  }

  // Fallback to cordova plugin if available
  const sms = getSmsPlugin();
  if (sms && typeof sms.hasPermission === 'function') {
    return new Promise((resolve) => {
      sms.hasPermission((has: boolean) => resolve(has), () => resolve(false));
    });
  }

  return false;
}

export async function requestSmsPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  
  console.log("Requesting SMS permissions...");
  
  // Check if already granted
  if (await checkSmsPermission()) {
    console.log("SMS permission already granted");
    return true;
  }

  let finalGranted = false;

  // Try custom plugin request first
  try {
    console.log("Trying SMSDetection.requestPermissions()");
    const status = await SMSDetection.requestPermissions();
    console.log("SMSDetection permission status:", JSON.stringify(status));
    if (status.sms === 'granted') {
      finalGranted = true;
    }
  } catch (error) {
    console.log("Custom plugin requestPermissions not available or failed", error);
  }

  if (finalGranted) return true;

  // Fallback to cordova plugin request - often more reliable for SMS on older Android
  const sms = getSmsPlugin();
  if (sms && typeof sms.requestPermission === 'function') {
    console.log("Trying cordova-plugin-sms requestPermission()");
    const cordovaGranted = await new Promise<boolean>((resolve) => {
      sms.requestPermission(
        () => {
          console.log("Cordova SMS permission granted");
          resolve(true);
        }, 
        (err: any) => {
          console.error("Cordova SMS permission request failed", err);
          resolve(false);
        }
      );
    });
    if (cordovaGranted) return true;
  }

  // One last check just in case the OS granted it but the plugin didn't return correctly
  const lastCheck = await checkSmsPermission();
  console.log("Final checkSmsPermission result:", lastCheck);
  return lastCheck;
}

export async function openSettingsFallback(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SMSDetection.openAppSettings();
  } catch (e) {
    console.error("Failed to open app settings via custom plugin", e);
  }
}


let isSyncingSMS = false;

export async function syncPendingSMS(limit: number = Infinity): Promise<{ count: number; limitReached: boolean }> {
  if (isSyncingSMS) return { count: 0, limitReached: false };
  
  if (!Capacitor.isNativePlatform()) {
    return { count: 0, limitReached: false };
  }
  
  isSyncingSMS = true;
  try {
    const sms = getSmsPlugin();
    if (!sms || typeof sms.listSMS !== 'function') {
      return { count: 0, limitReached: false };
    }

    // First check if the user actually enabled this feature
    if (localStorage.getItem('momo_sms_enabled') !== 'true') {
      return { count: 0, limitReached: false };
    }

    // Then verify permission
    const hasPermission = await checkSmsPermission();
    if (!hasPermission) {
      return { count: 0, limitReached: false };
    }

    return await new Promise((resolve) => {
      let count = 0;
      let indexFrom = 0;
      const maxBatchCount = 200;
      let hasMoreUnprocessed = false;
      let allProcessed = false;

      const processBatch = async () => {
        if (count >= limit || allProcessed) {
          resolve({ count, limitReached: hasMoreUnprocessed });
          return;
        }

        const filter = {
          box: 'inbox',
          indexFrom: indexFrom,
          maxCount: maxBatchCount,
          sort: 'date DESC' // Try to force newest first
        };

        sms.listSMS(
          filter,
          async (messages: any[]) => {
            try {
              if (!messages || messages.length === 0) {
                allProcessed = true;
                processBatch();
                return;
              }

              console.log(`Processing batch starting from ${indexFrom}, found ${messages.length} SMS...`);
              
              const existingTxs = await db.transactions.toArray();
              const existingTids = new Set(existingTxs.map(tx => tx.tid).filter(Boolean));
              const existingMessagesMap = new Map();
              for (const tx of existingTxs) {
                if (tx.rawMessage) {
                  const key = tx.rawMessage.trim().toLowerCase();
                  if (!existingMessagesMap.has(key)) existingMessagesMap.set(key, []);
                  existingMessagesMap.get(key).push(tx);
                }
              }

              const lastClearedStr = localStorage.getItem('momo_last_cleared_date');
              const lastClearedTime = lastClearedStr ? parseInt(lastClearedStr, 10) : 0;
              
              const autoSyncStartTimeStr = localStorage.getItem('momo_auto_sync_start_time');
              const autoSyncStartTime = autoSyncStartTimeStr ? parseInt(autoSyncStartTimeStr, 10) : Date.now();
              const cutoffTime = Math.max(autoSyncStartTime, lastClearedTime);
              
              let foundAnyFinancialInBatch = false;
              let foundAnyNewInBatch = false;

              for (const msg of messages) {
                if (count >= limit) {
                  hasMoreUnprocessed = true;
                  break;
                }

                // Skip if msg was received before the cutoff time (app install or last clear)
                if (msg.date && cutoffTime > 0 && typeof msg.date === 'number' && msg.date < cutoffTime) {
                  continue;
                }
                
                foundAnyNewInBatch = true;

                // Depending on cordova-plugin-sms format
                const msgBody = msg.body || '';
                const msgAddress = msg.address || msg.sender || '';

                const parsed = parseMoMoSMS(msgBody, msgAddress);
                if (parsed) {
                  foundAnyFinancialInBatch = true;

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
                     currentTxInDb = await db.transactions.where('tid').equals(parsed.transaction_id).first();
                     isDuplicate = existingTids.has(parsed.transaction_id) || !!currentTxInDb;
                  }

                  if (!isDuplicate) {
                    try {
                      const incomeTypes = ['received', 'deposit', 'airtime_sold', 'commission'];
                      const type = incomeTypes.includes(parsed.transaction_type) ? 'income' : 'expense';
                      
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

                      const newId = await db.transactions.add({
                        amount: parsed.amount || 0,
                        type,
                        category: categoryName,
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
                        rawMessage: parsed.raw_message || msgBody,
                        category: categoryName,
                        provider: parsed.provider,
                        type: type
                      } as any);

                      count++;
                      if (parsed.transaction_id) existingTids.add(parsed.transaction_id);
                      if (parsed.raw_message) {
                        const raw = parsed.raw_message.trim().toLowerCase();
                        if (!existingMessagesMap.has(raw)) existingMessagesMap.set(raw, []);
                        existingMessagesMap.get(raw).push({ id: newId, smsDate: parsed.date, date: txDate });
                      }
                    } catch (e) {
                      console.warn('Transaction already exists or error adding', e);
                    }
                  } else {
                    const existingTx = currentTxInDb || existingTxs.find((t: any) => 
                      (parsed.transaction_id && t.tid === parsed.transaction_id) || 
                      (!parsed.transaction_id && parsed.raw_message && t.rawMessage && (t.rawMessage.trim().toLowerCase() === parsed.raw_message.trim().toLowerCase()))
                    );
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
                        updates.note = parsed.sender_name ? `From ${parsed.sender_name}` : (parsed.receiver_name ? `To ${parsed.receiver_name}` : '');
                        updates.senderReceiverName = parsed.sender_name || parsed.receiver_name || undefined;
                        if (parsed.phone_number) updates.phoneNumber = parsed.phone_number;
                        updates.rawMessage = parsed.raw_message || msgBody;
                      }
                      
                      if (Object.keys(updates).length > 0) {
                        await db.transactions.update(existingTx.id, updates);
                        if (updates.category) existingTx.category = updates.category;
                        if (updates.senderReceiverName) existingTx.senderReceiverName = updates.senderReceiverName;
                        if (updates.phoneNumber) existingTx.phoneNumber = updates.phoneNumber;
                      }
                    }
                  }
                }
              }

              // If we didn't find ANY new messages in this batch (all were before cutoff), 
              // and the plugin returns in newest-first order, we can stop.
              // If it's oldest first, we should continue.
              // To be safe, we continue until we've checked a reasonable amount or hit the end.
              if (messages.length < maxBatchCount) {
                allProcessed = true;
              } else {
                indexFrom += maxBatchCount;
                // Safety: don't scan more than 2000 messages in auto-sync to avoid freezing
                if (indexFrom >= 2000) {
                  allProcessed = true;
                }
              }

              processBatch();
            } catch (e) {
              console.error('Error in batch sync:', e);
              allProcessed = true;
              processBatch();
            }
          },
          (err: any) => {
            console.error('Error syncing SMS batch:', err);
            resolve({ count, limitReached: false });
          }
        );
      };

      processBatch();
    });
  } finally {
    isSyncingSMS = false;
  }
}

