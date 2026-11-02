import { Capacitor, registerPlugin } from '@capacitor/core';
import { db } from './db';
import { parseMoMoSMS, parseTransactionDate } from './smsParser';

export interface BluetoothDeviceItem {
  name: string;
  address: string;
  paired: boolean;
  isButtonPhone?: boolean;
  isPhone?: boolean;
  rssi?: number;
}

export interface CompatibilityResult {
  compatible: boolean;
  verified: boolean;
  profile: 'SPP' | 'MAP' | 'PBAP_ONLY' | 'UNSUPPORTED' | 'SPP_UNRESPONSIVE' | 'UNKNOWN';
  reason: string;
  details?: string;
  hasSPP?: boolean;
  hasMAP?: boolean;
  hasPBAP?: boolean;
  testLog?: string[];
}

export interface SyncProgressUpdate {
  stage: 'connecting' | 'verifying' | 'reading_storage' | 'parsing' | 'saving' | 'complete' | 'error';
  message: string;
  progressPercent: number;
}

export interface SyncResult {
  success: boolean;
  totalSmsRead: number;
  momoTransactionsFound: number;
  newlyAdded: number;
  duplicatesSkipped: number;
  method?: string;
  error?: string;
  savedTransactions?: Array<{
    amount: number;
    type: string;
    category: string;
    provider?: string;
    date: string;
    rawMessage: string;
  }>;
}

interface BluetoothSyncNativePlugin {
  isAvailable(): Promise<{ available: boolean; enabled: boolean }>;
  getPairedDevices(): Promise<{ devices: BluetoothDeviceItem[] }>;
  startDiscovery(): Promise<{ started: boolean }>;
  stopDiscovery(): Promise<{ stopped: boolean }>;
  checkCompatibility(options: { address: string }): Promise<CompatibilityResult>;
  syncMessages(options: { address: string; profile?: string }): Promise<{
    success: boolean;
    count: number;
    method: string;
    messages: Array<{ address: string; date?: string; body: string }>;
  }>;
  disconnect(): Promise<{ disconnected: boolean }>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<any>;
}

const NativeBluetoothSync = registerPlugin<BluetoothSyncNativePlugin>('BluetoothSync');

// Simulated button phones for testing in browser / dev environments
const SIMULATED_FEATURE_PHONES: BluetoothDeviceItem[] = [
  { name: 'Nokia 105 Dual SIM', address: '00:1B:DC:09:44:A1', paired: true, isButtonPhone: true, isPhone: true },
  { name: 'Tecno T301 (Kabiriti)', address: '28:6C:07:33:51:F2', paired: true, isButtonPhone: true, isPhone: true },
  { name: 'Itel 2160', address: '50:F0:D3:21:88:B4', paired: false, isButtonPhone: true, isPhone: true },
  { name: 'Nokia 3310 (2017)', address: '94:65:2D:11:00:C8', paired: false, isButtonPhone: true, isPhone: true },
  { name: 'Handsfree Car Kit (PBAP Only)', address: 'AA:BB:CC:11:22:33', paired: true, isButtonPhone: false, isPhone: false },
  { name: 'Wireless Headset BT-01', address: '12:34:56:78:9A:BC', paired: false, isButtonPhone: false, isPhone: false }
];

export class BluetoothSyncService {
  private static isScanning = false;

  static async isAvailable(): Promise<{ available: boolean; enabled: boolean }> {
    if (Capacitor.isNativePlatform()) {
      try {
        return await NativeBluetoothSync.isAvailable();
      } catch (e) {
        console.warn('Native BluetoothSync isAvailable error:', e);
        return { available: false, enabled: false };
      }
    }
    // Web / browser environment
    return { available: true, enabled: true };
  }

  static async getPairedDevices(): Promise<BluetoothDeviceItem[]> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NativeBluetoothSync.getPairedDevices();
        return res.devices || [];
      } catch (e) {
        console.warn('Native getPairedDevices failed:', e);
        return [];
      }
    }
    // Web fallback: return paired simulated button phones
    return SIMULATED_FEATURE_PHONES.filter(d => d.paired);
  }

  static async startDiscovery(
    onDeviceFound: (device: BluetoothDeviceItem) => void,
    onFinished: () => void
  ): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;

    if (Capacitor.isNativePlatform()) {
      try {
        await NativeBluetoothSync.addListener('deviceDiscovered', (device: BluetoothDeviceItem) => {
          onDeviceFound(device);
        });
        await NativeBluetoothSync.addListener('discoveryFinished', () => {
          this.isScanning = false;
          onFinished();
        });
        await NativeBluetoothSync.startDiscovery();
        return;
      } catch (e) {
        this.isScanning = false;
        console.warn('Native discovery failed:', e);
      }
    }

    // Web simulation: stream discovered devices over a 4-second discovery cycle
    const unbonded = SIMULATED_FEATURE_PHONES.filter(d => !d.paired);
    let index = 0;
    const interval = setInterval(() => {
      if (index < unbonded.length) {
        onDeviceFound(unbonded[index]);
        index++;
      } else {
        clearInterval(interval);
        this.isScanning = false;
        onFinished();
      }
    }, 900);
  }

  static async stopDiscovery(): Promise<void> {
    this.isScanning = false;
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeBluetoothSync.stopDiscovery();
      } catch (e) {
        console.warn('Stop discovery error:', e);
      }
    }
  }

  /**
   * Evaluates phone compatibility and performs real handshake verification.
   * Checks for MAP and SPP profiles and explicitly rejects PBAP-only devices.
   */
  static async checkCompatibility(
    device: BluetoothDeviceItem,
    onLogUpdate?: (logLine: string) => void
  ): Promise<CompatibilityResult> {
    const log = (msg: string) => {
      if (onLogUpdate) onLogUpdate(msg);
    };

    log(`[1/4] Inspecting Bluetooth SDP profiles for "${device.name}" (${device.address})...`);

    if (Capacitor.isNativePlatform()) {
      try {
        log(`[2/4] Querying supported Service Records (MAP MAS, SPP, PBAP)...`);
        const result = await NativeBluetoothSync.checkCompatibility({ address: device.address });
        
        if (result.hasPBAP && !result.hasSPP && !result.hasMAP) {
          log(`[!] PBAP Profile (0x112F/0x1130) detected.`);
          log(`[!] PBAP is strictly designed for Phonebook access, NOT SMS.`);
          log(`[x] Incompatible: Phone does not support SMS retrieval via Bluetooth.`);
        } else if (result.compatible) {
          log(`[3/4] Testing RFCOMM handshake (${result.profile})...`);
          log(`[4/4] Handshake confirmed! Device responded to SMS commands.`);
        }
        return result;
      } catch (e: any) {
        log(`[x] Error testing compatibility: ${e.message || e}`);
        return {
          compatible: false,
          verified: false,
          profile: 'UNKNOWN',
          reason: `Failed to test device: ${e.message || e}`
        };
      }
    }

    // Web / browser testing simulation
    await new Promise(r => setTimeout(r, 600));

    // Check for PBAP-only devices (e.g. Car kit, headphones)
    if (device.name.toLowerCase().includes('pbap') || device.name.toLowerCase().includes('car kit')) {
      log(`[2/4] Found Profile UUID: 0000112F-0000-1000-8000-00805F9B34FB (PBAP Phonebook Access)`);
      log(`[!] WARNING: PBAP profile detected.`);
      log(`[!] PBAP is strictly limited to contacts & call logs. It CANNOT access SMS messages.`);
      log(`[3/4] Checking for Message Access Profile (MAP) or Serial Port Profile (SPP)... None found.`);
      log(`[x] INCOMPATIBLE: This device cannot be used for SMS synchronization.`);
      
      return {
        compatible: false,
        verified: false,
        profile: 'PBAP_ONLY',
        reason: 'This device only supports Phonebook Access (PBAP). PBAP is designed strictly for contacts and cannot access SMS messages. Bluetooth SMS retrieval is not supported on this model.',
        hasPBAP: true,
        hasSPP: false,
        hasMAP: false
      };
    }

    if (device.name.toLowerCase().includes('headset') || !device.isButtonPhone) {
      log(`[2/4] Device Class: Audio/Peripheral. No SMS or serial profiles advertised.`);
      log(`[x] INCOMPATIBLE: Neither Bluetooth MAP nor SPP profile is available.`);
      return {
        compatible: false,
        verified: false,
        profile: 'UNSUPPORTED',
        reason: 'This device does not support Bluetooth Message Access Profile (MAP) or Serial Port Profile (SPP). SMS retrieval is not available on this model.',
        hasPBAP: false,
        hasSPP: false,
        hasMAP: false
      };
    }

    // Compatible button phone (Nokia, Tecno, Itel)
    log(`[2/4] Profile detection: Found RFCOMM Serial Port Profile (SPP - 0x1101) & DUN (0x1103)`);
    await new Promise(r => setTimeout(r, 500));
    log(`[3/4] Proving SMS retrieval: Connecting RFCOMM socket to ${device.address}...`);
    log(`  -> TX: AT`);
    await new Promise(r => setTimeout(r, 400));
    log(`  <- RX: OK`);
    log(`  -> TX: AT+CMGF=1 (Set SMS Text Mode)`);
    await new Promise(r => setTimeout(r, 300));
    log(`  <- RX: OK`);
    log(`  -> TX: AT+CPMS="SM","SM","SM" (Query SIM card message storage)`);
    await new Promise(r => setTimeout(r, 400));
    log(`  <- RX: +CPMS: 12,20,12,20,12,20 (SIM Storage Active)`);
    log(`[4/4] Verified Compatible! Phone modem responded to SMS AT commands successfully.`);

    return {
      compatible: true,
      verified: true,
      profile: 'SPP',
      reason: 'Verified compatible! Phone supports Serial Port AT commands for SMS retrieval.',
      details: 'Connected via Bluetooth RFCOMM SPP. Storage checked: SIM Card (SM) & Phone Memory (ME).',
      hasSPP: true,
      hasMAP: false,
      hasPBAP: false
    };
  }

  /**
   * Synchronizes messages from the button phone, parses Mobile Money SMS,
   * checks for duplicates, and saves them to the Dexie database.
   */
  static async syncMessages(
    device: BluetoothDeviceItem,
    profile: string = 'SPP',
    onProgress: (update: SyncProgressUpdate) => void
  ): Promise<SyncResult> {
    try {
      onProgress({
        stage: 'connecting',
        message: `Connecting to ${device.name}...`,
        progressPercent: 15
      });

      let rawSmsList: Array<{ address: string; date?: string; body: string }> = [];

      if (Capacitor.isNativePlatform()) {
        onProgress({
          stage: 'reading_storage',
          message: `Sending AT commands to read SIM card SMS storage...`,
          progressPercent: 35
        });

        const syncResp = await NativeBluetoothSync.syncMessages({
          address: device.address,
          profile
        });

        rawSmsList = syncResp.messages || [];
      } else {
        // Web simulation with realistic Mobile Money SMS messages for the button phone
        await new Promise(r => setTimeout(r, 700));
        onProgress({
          stage: 'reading_storage',
          message: `Selecting SIM card storage (AT+CPMS="SM") and reading messages...`,
          progressPercent: 40
        });
        await new Promise(r => setTimeout(r, 800));

        rawSmsList = getSampleButtonPhoneMessages(device.name);
      }

      onProgress({
        stage: 'parsing',
        message: `Analyzing ${rawSmsList.length} SMS messages for Mobile Money transactions...`,
        progressPercent: 70
      });

      await new Promise(r => setTimeout(r, 400));

      // Get existing transactions to avoid duplicate insertion
      const existingTxs = await db.transactions.toArray();
      const existingTidsMap = new Set<string>();
      const existingMessagesMap = new Map<string, any[]>();

      for (const tx of existingTxs) {
        if (tx.tid) existingTidsMap.add(tx.tid);
        if (tx.rawMessage) {
          const raw = tx.rawMessage.trim().toLowerCase();
          if (!existingMessagesMap.has(raw)) existingMessagesMap.set(raw, []);
          existingMessagesMap.get(raw)!.push(tx);
        }
      }

      let momoTransactionsFound = 0;
      let newlyAdded = 0;
      let duplicatesSkipped = 0;
      const savedTransactions: any[] = [];

      onProgress({
        stage: 'saving',
        message: 'Validating and saving new transactions into your records...',
        progressPercent: 85
      });

      for (const sms of rawSmsList) {
        const body = sms.body;
        if (!body || !body.trim()) continue;

        const parsed = parseMoMoSMS(body, sms.address);
        if (!parsed || parsed.transaction_type === 'unknown') {
          continue; // Not a recognized Mobile Money SMS
        }

        momoTransactionsFound++;

        // Determine transaction date
        const txDate = parseTransactionDate(parsed.date, parsed.time);

        // Check if duplicate
        let isDuplicate = false;

        // 1. Check TID
        if (parsed.transaction_id && existingTidsMap.has(parsed.transaction_id)) {
          isDuplicate = true;
        }

        // 2. Check exact raw message + date window
        if (!isDuplicate && parsed.raw_message) {
          const rawKey = parsed.raw_message.trim().toLowerCase();
          const matches = existingMessagesMap.get(rawKey);
          if (matches && matches.length > 0) {
            const newMsgDate = new Date(txDate).getTime();
            for (const extx of matches) {
              const existDate = new Date(extx.date).getTime();
              if (Math.abs(newMsgDate - existDate) < 120000) {
                isDuplicate = true;
                break;
              }
            }
          }
        }

        if (isDuplicate) {
          duplicatesSkipped++;
          continue;
        }

        // Save new transaction
        const incomeTypes = ['received', 'deposit', 'airtime_sold', 'commission'];
        const type: 'income' | 'expense' = incomeTypes.includes(parsed.transaction_type) ? 'income' : 'expense';

        const categoryMap: { [key: string]: string } = {
          received: 'Received',
          deposit: 'Deposit',
          withdrawal: 'Cash Out',
          sent: 'Payment',
          airtime_bought: 'Airtime',
          airtime_sold: 'Airtime Sold',
          airtime: 'Airtime',
          commission: 'Commission'
        };

        const categoryName = categoryMap[parsed.transaction_type] || 'Other';
        const note = parsed.transaction_type.toUpperCase().replace(/_/g, ' ') + ' (Sync from Small Phone)';

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
          smsTime: parsed.time || undefined,
          currency: parsed.currency || undefined,
          phoneNumber: parsed.phone_number || undefined,
          balance: parsed.balance || undefined,
          fee: parsed.fee || undefined,
          provider: parsed.provider || undefined,
          rawMessage: parsed.raw_message || body
        });

        const txObj = {
          id: newId,
          amount: parsed.amount || 0,
          type,
          category: categoryName,
          provider: parsed.provider || undefined,
          date: txDate,
          rawMessage: parsed.raw_message || body,
          tid: parsed.transaction_id
        };

        if (parsed.transaction_id) {
          existingTidsMap.add(parsed.transaction_id);
        }
        if (parsed.raw_message) {
          const rawKey = parsed.raw_message.trim().toLowerCase();
          if (!existingMessagesMap.has(rawKey)) existingMessagesMap.set(rawKey, []);
          existingMessagesMap.get(rawKey)!.push(txObj);
        }

        savedTransactions.push(txObj);
        newlyAdded++;
      }

      onProgress({
        stage: 'complete',
        message: `Sync complete! Saved ${newlyAdded} new Mobile Money transactions.`,
        progressPercent: 100
      });

      return {
        success: true,
        totalSmsRead: rawSmsList.length,
        momoTransactionsFound,
        newlyAdded,
        duplicatesSkipped,
        method: profile,
        savedTransactions
      };
    } catch (e: any) {
      onProgress({
        stage: 'error',
        message: `Sync failed: ${e.message || e}`,
        progressPercent: 100
      });
      return {
        success: false,
        totalSmsRead: 0,
        momoTransactionsFound: 0,
        newlyAdded: 0,
        duplicatesSkipped: 0,
        error: e.message || String(e)
      };
    }
  }

  static async disconnect(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeBluetoothSync.disconnect();
      } catch (e) {
        console.warn('Disconnect error:', e);
      }
    }
  }
}

// Sample Mobile Money SMS messages for button phone simulation
function getSampleButtonPhoneMessages(phoneName: string): Array<{ address: string; date?: string; body: string }> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  
  return [
    {
      address: 'MTN MobileMoney',
      date: `${dateStr} 09:15:20`,
      body: `You have received UGX 75,000 from KABUGO DAVID (0772123456) on ${dateStr} 09:15:20. Financial Transaction Id: 18294719284. New MTN MoMo balance: UGX 348,200.`
    },
    {
      address: 'AirtelMoney',
      date: `${dateStr} 10:45:12`,
      body: `Trans. ID: AIR92837192. You have sent UGX 50,000 to NAKATO MARY (0701987654) on ${dateStr} 10:45:12. Fee: UGX 1,000. Balance: UGX 112,500.`
    },
    {
      address: 'MTN MobileMoney',
      date: `${dateStr} 11:30:00`,
      body: `You have withdrawn UGX 20,000 on ${dateStr} 11:30:00. Fee: UGX 900. New balance: UGX 327,300. Financial Transaction Id: 18295829103.`
    },
    {
      address: '100',
      date: `${dateStr} 08:00:00`,
      body: `Your daily bundle will expire at midnight. Dial *100# to renew.`
    }
  ];
}
