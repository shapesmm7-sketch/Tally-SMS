import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  ShieldCheck, 
  History, 
  WifiOff, 
  ChevronRight,
  Radio,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { 
  BluetoothSyncService, 
  BluetoothDeviceItem, 
  CompatibilityResult, 
  SyncProgressUpdate, 
  SyncResult 
} from '../lib/bluetoothSync';

export default function SyncSmallPhone() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Bluetooth states
  const [isBtEnabled, setIsBtEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDeviceItem[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDeviceItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDeviceItem | null>(null);

  // Compatibility testing states
  const [isTestingCompat, setIsTestingCompat] = useState(false);
  const [compatibilityResult, setCompatibilityResult] = useState<CompatibilityResult | null>(null);
  const [compatLog, setCompatLog] = useState<string[]>([]);
  const [showLogDetails, setShowLogDetails] = useState(false);

  // Connection and synchronization states
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgressUpdate | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Instructions accordion
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    loadInitialDevices();
    return () => {
      BluetoothSyncService.stopDiscovery();
    };
  }, []);

  const loadInitialDevices = async () => {
    const status = await BluetoothSyncService.isAvailable();
    setIsBtEnabled(status.enabled);
    if (status.enabled) {
      const paired = await BluetoothSyncService.getPairedDevices();
      setPairedDevices(paired);
      if (paired.length > 0 && !selectedDevice) {
        setSelectedDevice(paired[0]);
      }
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);

    await BluetoothSyncService.startDiscovery(
      (device) => {
        setDiscoveredDevices((prev) => {
          if (prev.some((d) => d.address === device.address)) return prev;
          return [...prev, device];
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
    setCompatibilityResult(null);
    setCompatLog([]);
    setIsConnected(false);
    setSyncResult(null);
  };

  const handleTestCompatibility = async (deviceToTest: BluetoothDeviceItem) => {
    setIsTestingCompat(true);
    setCompatibilityResult(null);
    setCompatLog([]);
    setSyncResult(null);

    const logs: string[] = [];
    const result = await BluetoothSyncService.checkCompatibility(deviceToTest, (line) => {
      logs.push(line);
      setCompatLog([...logs]);
    });

    setIsTestingCompat(false);
    setCompatibilityResult(result);
    if (result.verified && result.compatible) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  };

  const handleDisconnect = async () => {
    await BluetoothSyncService.disconnect();
    setIsConnected(false);
  };

  const handleSyncMessages = async () => {
    if (!selectedDevice || !compatibilityResult?.compatible) return;

    setIsSyncing(true);
    setSyncResult(null);

    const result = await BluetoothSyncService.syncMessages(
      selectedDevice,
      compatibilityResult.profile,
      (update) => {
        setSyncProgress(update);
      }
    );

    setIsSyncing(false);
    setSyncResult(result);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] transition-colors">
      {/* Top Header */}
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

      <div className="p-4 space-y-5 pb-16 max-w-2xl mx-auto w-full">
        {/* Information & Pairing Guide Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                  Supported Button Phones (Kabiriti)
                </h2>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 leading-relaxed">
                  Easily transfer Mobile Money messages from Nokia, Tecno, Itel, and other feature phones using Bluetooth SPP or MAP.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold underline shrink-0 ml-2"
            >
              {showInstructions ? 'Hide Guide' : 'Pairing Guide'}
            </button>
          </div>

          {showInstructions && (
            <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 space-y-2">
              <p className="font-semibold text-blue-950 dark:text-white">Quick 3-Step Setup:</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1">
                <li><strong>Turn Bluetooth On</strong> on your small button phone and set <em>Visibility</em> to On.</li>
                <li><strong>Pair the phone</strong> with this Android device in Bluetooth settings if not already paired.</li>
                <li><strong>Select your button phone below</strong> and tap <em>"Test Phone Compatibility"</em> to verify SMS retrieval.</li>
              </ol>
              <div className="bg-white/80 dark:bg-gray-800/80 p-2.5 rounded-lg border border-blue-200 dark:border-gray-700 mt-2">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-white">Note on Compatibility:</strong> SMS retrieval requires Bluetooth <strong>Message Access Profile (MAP)</strong> or <strong>Serial Port Profile (SPP)</strong>. Phonebook Profile (PBAP) is designed for contacts only and cannot be used for SMS.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Device Discovery & Selection */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center">
              <Radio className="w-4 h-4 mr-1.5 text-blue-600" />
              1. Select Button Phone
            </h2>
            <div className="flex space-x-2">
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
          </div>

          {/* Paired Devices */}
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Paired Phones ({pairedDevices.length})
            </span>
            {pairedDevices.length === 0 ? (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-center text-xs text-gray-500 dark:text-gray-400">
                No paired button phones found. Make sure Bluetooth is turned on.
              </div>
            ) : (
              <div className="space-y-2">
                {pairedDevices.map((dev) => {
                  const isSelected = selectedDevice?.address === dev.address;
                  return (
                    <div
                      key={dev.address}
                      onClick={() => handleSelectDevice(dev)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
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
                                Feature Phone
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">{dev.address} &bull; Paired</p>
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
          </div>

          {/* Discovered Devices */}
          {discoveredDevices.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                Available Nearby Devices ({discoveredDevices.length})
              </span>
              <div className="space-y-2">
                {discoveredDevices.map((dev) => {
                  const isSelected = selectedDevice?.address === dev.address;
                  return (
                    <div
                      key={dev.address}
                      onClick={() => handleSelectDevice(dev)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                        }`}>
                          <Bluetooth className="w-4 h-4" />
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
                          <p className="text-[11px] text-gray-400 font-mono">{dev.address} &bull; Nearby</p>
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
            </div>
          )}
        </section>

        {/* Section 2: Compatibility Detection & Proof */}
        {selectedDevice && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-600" />
                2. Compatibility Check & Test
              </h2>
              {compatibilityResult && (
                <button
                  onClick={() => setShowLogDetails(!showLogDetails)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  <Terminal className="w-3.5 h-3.5 mr-1" />
                  {showLogDetails ? 'Hide Test Log' : 'View Test Log'}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Before syncing, we inspect the phone's Bluetooth capabilities (MAP or SPP) and test an actual SMS command handshake with <strong>{selectedDevice.name}</strong> to prove retrieval works.
            </p>

            {/* Test Compatibility Button */}
            {!compatibilityResult && (
              <button
                onClick={() => handleTestCompatibility(selectedDevice)}
                disabled={isTestingCompat}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-bold shadow-sm flex items-center justify-center transition-colors"
              >
                {isTestingCompat ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing Phone Compatibility...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Test Phone Compatibility
                  </>
                )}
              </button>
            )}

            {/* Compatibility Result Card */}
            {compatibilityResult && (
              <div className="space-y-3">
                {compatibilityResult.compatible ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-green-900 dark:text-green-100">
                            Verified Compatible!
                          </h3>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full">
                            Profile: {compatibilityResult.profile}
                          </span>
                        </div>
                        <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                          {compatibilityResult.reason}
                        </p>
                        {compatibilityResult.details && (
                          <p className="text-[11px] text-green-700 dark:text-green-300 mt-1">
                            {compatibilityResult.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-red-900 dark:text-red-100">
                            SMS Retrieval Not Supported
                          </h3>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full">
                            {compatibilityResult.profile}
                          </span>
                        </div>
                        <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                          {compatibilityResult.reason}
                        </p>
                        {compatibilityResult.hasPBAP && (
                          <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800">
                            <strong>PBAP Note:</strong> Phonebook Access Profile (PBAP) is strictly limited to contacts. Tally SMS will not attempt to read SMS via PBAP.
                          </div>
                        )}
                        <button
                          onClick={() => handleTestCompatibility(selectedDevice)}
                          className="mt-3 text-xs text-red-700 dark:text-red-300 font-semibold underline"
                        >
                          Retry Compatibility Test
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Log Terminal */}
                {(showLogDetails || isTestingCompat) && compatLog.length > 0 && (
                  <div className="bg-gray-900 text-green-400 p-3 rounded-xl font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto">
                    {compatLog.map((line, idx) => (
                      <div key={idx} className="leading-tight">{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Section 3: Connect & Sync Messages */}
        {selectedDevice && compatibilityResult?.compatible && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center">
                <Download className="w-4 h-4 mr-1.5 text-blue-600" />
                3. Sync Messages
              </h2>
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline ml-2"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Read stored SMS messages from the SIM card and phone memory of <strong>{selectedDevice.name}</strong>, detect Mobile Money transactions (MTN MoMo, Airtel Money, etc.), and save them to your database.
            </p>

            {/* Sync Progress Bar */}
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

            {/* Sync Messages Button */}
            <button
              onClick={handleSyncMessages}
              disabled={isSyncing}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md flex items-center justify-center transition-all"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Synchronizing Mobile Money SMS...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Sync Messages
                </>
              )}
            </button>

            {/* Synchronization Results Summary */}
            {syncResult && (
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
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

                {/* Metric Badges */}
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

                {/* Saved Transactions Preview */}
                {syncResult.savedTransactions && syncResult.savedTransactions.length > 0 && (
                  <div>
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
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
