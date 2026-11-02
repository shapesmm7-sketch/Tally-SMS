import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bluetooth, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Smartphone, 
  Info, 
  Download, 
  ChevronRight,
  Radio,
  ExternalLink
} from 'lucide-react';
import { 
  BluetoothSyncService, 
  BluetoothDeviceItem, 
  SyncProgressUpdate, 
  SyncResult 
} from '../lib/bluetoothSync';

export default function SyncSmallPhone() {
  const navigate = useNavigate();

  // Devices & scanning
  const [devices, setDevices] = useState<BluetoothDeviceItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDeviceItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressUpdate | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Pairing guide visibility
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadInitialDevices();
    return () => {
      BluetoothSyncService.stopDiscovery();
    };
  }, []);

  const loadInitialDevices = async () => {
    const list = await BluetoothSyncService.getInitialDevices();
    setDevices(list);
    if (list.length > 0 && !selectedDevice) {
      setSelectedDevice(list[0]);
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    await BluetoothSyncService.startDiscovery(
      (newDevice) => {
        setDevices((prev) => {
          if (prev.some((d) => d.address === newDevice.address)) return prev;
          return [...prev, newDevice];
        });
      },
      () => {
        setIsScanning(false);
      }
    );
  };

  const handleStopScan = async () => {
    await BluetoothSyncService.stopDiscovery();
    setIsScanning(false);
  };

  const handleSelectDevice = (device: BluetoothDeviceItem) => {
    setSelectedDevice(device);
    setSyncResult(null);
  };

  const handleSyncMessages = async () => {
    if (!selectedDevice || isSyncing) return;

    setIsSyncing(true);
    setSyncResult(null);

    const result = await BluetoothSyncService.syncDirectly(selectedDevice, (update) => {
      setSyncProgress(update);
    });

    setIsSyncing(false);
    setSyncResult(result);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] transition-colors">
      {/* Sticky Top Header */}
      <div className="bg-white dark:bg-gray-900 px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="mr-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
              <Bluetooth className="w-5 h-5 mr-2 text-blue-600" />
              Sync from Small Phone
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Save Mobile Money SMS from small button phones
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-16 max-w-2xl mx-auto w-full">
        {/* Support & Quick Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                  Supported Small Phones (Kabiriti)
                </h2>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 leading-relaxed">
                  Transfer Mobile Money messages live from compatible Nokia, Tecno, Itel, and other feature phones.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold underline shrink-0 ml-2"
            >
              {showGuide ? 'Hide Guide' : 'Pairing Guide'}
            </button>
          </div>

          {showGuide && (
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 space-y-2">
              <ol className="list-decimal list-inside space-y-1.5 pl-1">
                <li>Turn <strong>Bluetooth On</strong> on your button phone and set visibility to On.</li>
                <li>Make sure your button phone is connected or visible to this Android device.</li>
                <li>Select the phone below and tap <strong>Sync Messages</strong> to import your transactions.</li>
              </ol>
            </div>
          )}
        </div>

        {/* Unified Devices Selection */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center">
              <Radio className="w-4 h-4 mr-1.5 text-blue-600" />
              Select Small Phone
            </h2>
            {isScanning ? (
              <button
                onClick={handleStopScan}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold flex items-center transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-blue-600" />
                Stop Scanning
              </button>
            ) : (
              <button
                onClick={handleStartScan}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Scan Nearby
              </button>
            )}
          </div>

          {/* Unified Device List */}
          {devices.length === 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center text-xs text-gray-500 dark:text-gray-400">
              No phones found yet. Tap <strong>Scan Nearby</strong> with your button phone turned on and visible.
            </div>
          ) : (
            <div className="space-y-2.5">
              {devices.map((dev) => {
                const isSelected = selectedDevice?.address === dev.address;
                return (
                  <div
                    key={dev.address}
                    onClick={() => handleSelectDevice(dev)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-blue-600/30'
                        : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}>
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                          {dev.name}
                          {dev.isButtonPhone && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded font-medium">
                              Button Phone
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono">{dev.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sync Messages Action */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            {isSyncing && syncProgress && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 font-medium">
                  <span>{syncProgress.message}</span>
                  <span>{syncProgress.progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSyncMessages}
              disabled={!selectedDevice || isSyncing}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center transition-all cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Synchronizing from {selectedDevice?.name || 'Phone'}...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Sync Messages
                </>
              )}
            </button>
          </div>
        </section>

        {/* Incompatible Alert (If phone type does not accept work with MAP or SPP) */}
        {syncResult && syncResult.notCompatible && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl">
            <div className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900 dark:text-red-100">
                  Your phone is not compatible for this sync
                </h3>
                <p className="text-xs text-red-800 dark:text-red-200 mt-1 leading-relaxed">
                  This phone does not support Bluetooth MAP (Message Access Profile) or SPP (Serial Port Profile) required for SMS synchronization.
                </p>
                <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                  Please ensure you are using a compatible Nokia, Tecno, Itel, or standard feature phone with Bluetooth SMS capability enabled.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General Error (Timeout or Disconnected) */}
        {syncResult && !syncResult.success && !syncResult.notCompatible && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                  Connection Failed
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  {syncResult.errorMessage || syncResult.error || 'Could not connect to the phone. Make sure Bluetooth is visible.'}
                </p>
                <button
                  onClick={handleSyncMessages}
                  className="mt-2 text-xs text-amber-800 dark:text-amber-300 font-semibold underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Synchronization Success Results */}
        {syncResult && syncResult.success && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-600" />
                Synchronization Results
              </h3>
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center hover:underline"
              >
                View in History
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase font-semibold block">
                  Total SMS Read
                </span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {syncResult.totalSmsRead}
                </span>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 text-center">
                <span className="text-[11px] text-blue-600 dark:text-blue-400 uppercase font-semibold block">
                  Mobile Money Found
                </span>
                <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {syncResult.momoTransactionsFound}
                </span>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-xl border border-green-100 dark:border-green-900/50 text-center">
                <span className="text-[11px] text-green-600 dark:text-green-400 uppercase font-semibold block">
                  Newly Added
                </span>
                <span className="text-xl font-bold text-green-700 dark:text-green-300">
                  +{syncResult.newlyAdded}
                </span>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50 text-center">
                <span className="text-[11px] text-amber-600 dark:text-amber-400 uppercase font-semibold block">
                  Duplicates Skipped
                </span>
                <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                  {syncResult.duplicatesSkipped}
                </span>
              </div>
            </div>

            {/* Recently Imported Preview */}
            {syncResult.savedTransactions && syncResult.savedTransactions.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-2">
                  Recently Imported Transactions
                </span>
                <div className="space-y-2">
                  {syncResult.savedTransactions.map((tx, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          {tx.category} ({tx.provider || 'MoMo'})
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[220px]">
                          {tx.rawMessage}
                        </p>
                      </div>
                      <span className={`text-xs font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
