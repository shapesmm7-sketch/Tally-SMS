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

export interface SyncProgressUpdate {
  stage: 'connecting' | 'verifying' | 'reading_storage' | 'parsing' | 'saving' | 'complete' | 'error';
  message: string;
  progressPercent: number;
}

export interface SyncResult {
  success: boolean;
  notCompatible?: boolean;
  totalSmsRead: number;
  momoTransactionsFound: number;
  newlyAdded: number;
  duplicatesSkipped: number;
  method?: string;
  error?: string;
  errorMessage?: string;
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
  checkCompatibility(options: { address: string }): Promise<{
    compatible: boolean;
    verified: boolean;
    profile: string;
    reason: string;
    hasSPP?: boolean;
    hasMAP?: boolean;
    hasPBAP?: boolean;
  }>;
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

// Known test/simulated devices for live test environment
const ALL_BUTTON_PHONES: BluetoothDeviceItem[] = [
  { name: 'Nokia 105 Dual SIM', address: '00:1B:DC:09:44:A1', paired: true, isButtonPhone: true, isPhone: true },
  { name: 'Tecno T301 (Kabiriti)', address: '28:6C:07:33:51:F2', paired: true, isButtonPhone: true, isPhone: true },
  { name: 'Itel 2160', address: '50:F0:D3:21:88:B4', paired: true, isButtonPhone: true, isPhone: true },
  { name: 'Nokia 3310 (2017)', address: '94:65:2D:11:00:C8', paired: false, isButtonPhone: true, isPhone: true },
  { name: 'Tecno T401 Dual SIM', address: 'B4:CD:27:88:99:AA', paired: false, isButtonPhone: true, isPhone: true },
  { name: 'Handsfree Car Kit (PBAP Only)', address: 'AA:BB:CC:11:22:33', paired: false, isButtonPhone: false, isPhone: false }
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
    return { available: true, enabled: true };
  }

  static async getInitialDevices(): Promise<BluetoothDeviceItem[]> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NativeBluetoothSync.getPairedDevices();
        return res.devices || [];
      } catch (e) {
        console.warn('Native getPairedDevices failed:', e);
        return [];
      }
    }
    // Web fallback: return known button phones
    return ALL_BUTTON_PHONES.slice(0, 3);
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

    // Web simulation: stream remaining devices
    const extraDevices = ALL_BUTTON_PHONES.slice(3);
    let index = 0;
    const interval = setInterval(() => {
      if (index < extraDevices.length) {
        onDeviceFound(extraDevices[index]);
        index++;
      } else {
        clearInterval(interval);
        this.isScanning = false;
        onFinished();
      }
    }, 1000);
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
   * Directly attempts live synchronization.
   * Tests MAP and SPP under the hood. If the phone does not support or accept either method,
   * returns notCompatible = true with "Your phone is not compatible for this sync".
   */
  static async syncDirectly(
    device: BluetoothDeviceItem,
    onProgress: (update: SyncProgressUpdate) => void
  ): Promise<SyncResult> {
    try {
      onProgress({
        stage: 'connecting',
        message: `Connecting to ${device.name}...`,
        progressPercent: 20
      });

      // 1. Protocol detection (MAP or SPP)
      let resolvedMethod = 'SPP';
      let isCompatible = true;

      if (Capacitor.isNativePlatform()) {
        onProgress({
          stage: 'verifying',
          message: `Checking Bluetooth MAP and SPP protocol support...`,
          progressPercent: 40
        });

        const compat = await NativeBluetoothSync.checkCompatibility({ address: device.address });
        if (!compat.compatible) {
          isCompatible = false;
        } else {
          resolvedMethod = compat.profile || 'SPP';
        }
      } else {
        await new Promise(r => setTimeout(r, 600));
        // Incompatible check for test devices
        if (
          device.name.toLowerCase().includes('pbap') ||
          device.name.toLowerCase().includes('car kit') ||
          device.name.toLowerCase().includes('headset') ||
          device.isButtonPhone === false
        ) {
          isCompatible = false;
        } else {
          resolvedMethod = 'SPP';
        }
      }

      // If the phone does not accept or work with our methods:
      if (!isCompatible) {
        onProgress({
          stage: 'error',
          message: 'Your phone is not compatible for this sync',
          progressPercent: 100
        });
        return {
          success: false,
          notCompatible: true,
          error: 'Your phone is not compatible for this sync',
          errorMessage: 'This phone does not support Bluetooth MAP or SPP protocols required for SMS retrieval.',
          totalSmsRead: 0,
          momoTransactionsFound: 0,
          newlyAdded: 0,
          duplicatesSkipped: 0
        };
      }

      // 2. Read SMS messages
      onProgress({
        stage: 'reading_storage',
        message: `Reading SIM messages from ${device.name} via ${resolvedMethod}...`,
        progressPercent: 60
      });

      let rawSmsList: Array<{ address: string; date?: string; body: string }> = [];

      if (Capacitor.isNativePlatform()) {
        const syncResp = await NativeBluetoothSync.syncMessages({
          address: device.address,
          profile: resolvedMethod
        });
        rawSmsList = syncResp.messages || [];
      } else {
        await new Promise(r => setTimeout(r, 800));
        rawSmsList = getSampleButtonPhoneMessages();
      }

      // 3. Parse Mobile Money SMS
      onProgress({
        stage: 'parsing',
        message: `Parsing ${rawSmsList.length} SMS messages for Mobile Money transactions...`,
        progressPercent: 80
      });

      await new Promise(r => setTimeout(r, 300));

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

      for (const sms of rawSmsList) {
        const body = sms.body;
        if (!body || !body.trim()) continue;

        const parsed = parseMoMoSMS(body, sms.address);
        if (!parsed || parsed.transaction_type === 'unknown') {
          continue;
        }

        momoTransactionsFound++;
        const txDate = parseTransactionDate(parsed.date, parsed.time);
        let isDuplicate = false;

        if (parsed.transaction_id && existingTidsMap.has(parsed.transaction_id)) {
          isDuplicate = true;
        }

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

        if (parsed.transaction_id) existingTidsMap.add(parsed.transaction_id);
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
        method: resolvedMethod,
        savedTransactions
      };
    } catch (e: any) {
      return {
        success: false,
        notCompatible: false,
        error: e.message || String(e),
        errorMessage: 'Connection timed out or failed. Please ensure Bluetooth visibility is turned On.',
        totalSmsRead: 0,
        momoTransactionsFound: 0,
        newlyAdded: 0,
        duplicatesSkipped: 0
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

function getSampleButtonPhoneMessages(): Array<{ address: string; date?: string; body: string }> {
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
