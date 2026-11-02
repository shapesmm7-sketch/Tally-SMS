import { Capacitor, registerPlugin } from '@capacitor/core';
import { db } from './db';
import { parseMoMoSMS, parseTransactionDate } from './smsParser';

export interface BluetoothDeviceItem {
  name: string;
  address: string;
  paired: boolean;
  deviceType?: string;
  deviceClass?: number;
}

export type DiagnosticStatus = 
  | 'MAP_SUPPORTED' 
  | 'SPP_SUPPORTED' 
  | 'UNSUPPORTED' 
  | 'UNDETERMINED';

export interface DeviceDiagnostics {
  diagnosticStatus: DiagnosticStatus;
  diagnosticMessage: string;
  mapSupported: boolean;
  sppSupported: boolean;
  sppSerialOnly: boolean;
  pbapOnly: boolean;
  preferredMethod: 'MAP' | 'SPP' | null;
  isCompatible: boolean;
}

export interface SyncProgressUpdate {
  stage: 'connecting' | 'verifying' | 'reading_storage' | 'parsing' | 'saving' | 'complete' | 'error';
  message: string;
  progressPercent: number;
}

export interface SyncResult {
  success: boolean;
  diagnosticStatus?: DiagnosticStatus;
  statusLabel?: string;
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
  checkPermissions(): Promise<{ granted: boolean }>;
  requestBluetoothPermissions(): Promise<{ granted: boolean }>;
  getPairedDevices(): Promise<{ devices: BluetoothDeviceItem[] }>;
  startDiscovery(): Promise<{ started: boolean }>;
  stopDiscovery(): Promise<{ stopped: boolean }>;
  diagnoseDevice(options: { address: string }): Promise<DeviceDiagnostics>;
  syncMessages(options: { address: string; method?: string }): Promise<{
    success: boolean;
    count: number;
    method: string;
    error?: string;
    messages?: Array<{ address: string; date?: string; body: string }>;
  }>;
  disconnect(): Promise<{ disconnected: boolean }>;
  addListener(eventName: string, listenerFunc: (data: any) => void): Promise<any>;
}

const NativeBluetoothSync = registerPlugin<BluetoothSyncNativePlugin>('BluetoothSync');

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

  static async requestPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NativeBluetoothSync.requestBluetoothPermissions();
        return res.granted;
      } catch (e) {
        console.warn('Bluetooth permission request failed:', e);
        return false;
      }
    }
    return true;
  }

  /**
   * Retrieves real paired Bluetooth devices from the Android system.
   */
  static async getInitialDevices(): Promise<BluetoothDeviceItem[]> {
    if (Capacitor.isNativePlatform()) {
      try {
        await this.requestPermissions();
        const res = await NativeBluetoothSync.getPairedDevices();
        return res.devices || [];
      } catch (e) {
        console.warn('Native getPairedDevices failed:', e);
        return [];
      }
    }
    return [];
  }

  /**
   * Scans for real nearby Bluetooth devices over the air.
   */
  static async startDiscovery(
    onDeviceFound: (device: BluetoothDeviceItem) => void,
    onFinished: () => void
  ): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;

    if (Capacitor.isNativePlatform()) {
      try {
        await this.requestPermissions();
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
        console.warn('Native startDiscovery failed:', e);
        onFinished();
      }
    } else {
      this.isScanning = false;
      onFinished();
    }
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
   * Runs diagnostic compatibility tests on MAP and SPP separately.
   */
  static async diagnoseDevice(device: BluetoothDeviceItem): Promise<DeviceDiagnostics> {
    if (Capacitor.isNativePlatform()) {
      try {
        return await NativeBluetoothSync.diagnoseDevice({ address: device.address });
      } catch (e: any) {
        return {
          diagnosticStatus: 'UNDETERMINED',
          diagnosticMessage: `Compatibility could not be determined: ${e.message || e}`,
          mapSupported: false,
          sppSupported: false,
          sppSerialOnly: false,
          pbapOnly: false,
          preferredMethod: null,
          isCompatible: false
        };
      }
    }

    return {
      diagnosticStatus: 'UNDETERMINED',
      diagnosticMessage: 'Diagnostics requires Android native Bluetooth.',
      mapSupported: false,
      sppSupported: false,
      sppSerialOnly: false,
      pbapOnly: false,
      preferredMethod: null,
      isCompatible: false
    };
  }

  /**
   * Performs live synchronization:
   * 1. Diagnoses MAP and SPP separately.
   * 2. If neither method is supported for SMS, reports: "Bluetooth available but SMS retrieval unsupported".
   * 3. If supported, connects using the verified method and retrieves SMS messages.
   * 4. Only reports success when actual SMS messages have been retrieved.
   */
  static async syncDirectly(
    device: BluetoothDeviceItem,
    onProgress: (update: SyncProgressUpdate) => void
  ): Promise<SyncResult> {
    try {
      onProgress({
        stage: 'connecting',
        message: `Connecting to ${device.name}...`,
        progressPercent: 15
      });

      // 1. Separate protocol detection and verification
      onProgress({
        stage: 'verifying',
        message: 'Checking Bluetooth MAP and SPP protocol support...',
        progressPercent: 35
      });

      let diag: DeviceDiagnostics;
      if (Capacitor.isNativePlatform()) {
        diag = await NativeBluetoothSync.diagnoseDevice({ address: device.address });
      } else {
        diag = {
          diagnosticStatus: 'UNDETERMINED',
          diagnosticMessage: 'Web environment does not support native Bluetooth RFCOMM/MAP sockets.',
          mapSupported: false,
          sppSupported: false,
          sppSerialOnly: false,
          pbapOnly: false,
          preferredMethod: null,
          isCompatible: false
        };
      }

      if (!diag.isCompatible || !diag.preferredMethod) {
        onProgress({
          stage: 'error',
          message: diag.diagnosticMessage,
          progressPercent: 100
        });

        let statusLabel = 'Compatibility could not be determined';
        if (diag.diagnosticStatus === 'UNSUPPORTED') {
          statusLabel = 'Bluetooth available but SMS retrieval unsupported';
        }

        return {
          success: false,
          diagnosticStatus: diag.diagnosticStatus,
          statusLabel,
          error: statusLabel,
          errorMessage: diag.diagnosticMessage,
          totalSmsRead: 0,
          momoTransactionsFound: 0,
          newlyAdded: 0,
          duplicatesSkipped: 0
        };
      }

      // 2. Retrieve SMS messages using the verified method
      const method = diag.preferredMethod;
      const statusLabel = method === 'MAP' ? 'MAP detected and tested' : 'SPP detected and tested';

      onProgress({
        stage: 'reading_storage',
        message: `Reading SMS messages from ${device.name} via ${method}...`,
        progressPercent: 60
      });

      let rawSmsList: Array<{ address: string; date?: string; body: string }> = [];

      if (Capacitor.isNativePlatform()) {
        const syncResp = await NativeBluetoothSync.syncMessages({
          address: device.address,
          method
        });

        if (!syncResp.success || !syncResp.messages || syncResp.messages.length === 0) {
          onProgress({
            stage: 'error',
            message: syncResp.error || 'No SMS messages could be retrieved from the device.',
            progressPercent: 100
          });
          return {
            success: false,
            diagnosticStatus: diag.diagnosticStatus,
            statusLabel,
            error: 'No SMS messages retrieved',
            errorMessage: syncResp.error || 'Connection completed but 0 SMS messages were retrieved. Make sure the phone has SMS messages in memory.',
            totalSmsRead: 0,
            momoTransactionsFound: 0,
            newlyAdded: 0,
            duplicatesSkipped: 0
          };
        }

        rawSmsList = syncResp.messages;
      }

      // 3. Parse Mobile Money SMS
      onProgress({
        stage: 'parsing',
        message: `Analyzing ${rawSmsList.length} SMS messages for Mobile Money transactions...`,
        progressPercent: 85
      });

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
        message: `SMS retrieval successful! Processed ${rawSmsList.length} messages.`,
        progressPercent: 100
      });

      return {
        success: true,
        diagnosticStatus: diag.diagnosticStatus,
        statusLabel: 'SMS retrieval successful',
        totalSmsRead: rawSmsList.length,
        momoTransactionsFound,
        newlyAdded,
        duplicatesSkipped,
        method,
        savedTransactions
      };

    } catch (e: any) {
      return {
        success: false,
        diagnosticStatus: 'UNDETERMINED',
        statusLabel: 'Compatibility could not be determined',
        error: e.message || String(e),
        errorMessage: 'Connection failed or timed out. Please verify that Bluetooth is turned on and visible on the remote phone.',
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
