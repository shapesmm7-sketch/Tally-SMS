import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Check, Loader2, ImagePlus, StopCircle, PlayCircle, AlertCircle } from 'lucide-react';
import Tesseract from 'tesseract.js';
import Webcam from 'react-webcam';
import { extractMultipleTransactions, parseTransactionDate } from '../lib/smsParser';
import { db } from '../lib/db';

export default function CameraScanner() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const scanIntervalRef = useRef<any>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [accumulatedText, setAccumulatedText] = useState<string>('');
  const [parsedDataList, setParsedDataList] = useState<any[]>([]);
  const [duplicateStatuses, setDuplicateStatuses] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [workerReady, setWorkerReady] = useState(false);

  useEffect(() => {
    const checkDuplicates = async () => {
      if (parsedDataList.length > 0) {
        const statuses = await Promise.all(parsedDataList.map(async (parsedData) => {
          if (parsedData && parsedData.transaction_id) {
            const existingTx = await db.transactions.where('tid').equals(parsedData.transaction_id).first();
            return !!existingTx;
          }
          return false;
        }));
        setDuplicateStatuses(statuses);
      } else {
        setDuplicateStatuses([]);
      }
    };
    checkDuplicates();
  }, [parsedDataList]);

  useEffect(() => {
    const initWorker = async () => {
      try {
        const worker = await Tesseract.createWorker('eng');
        workerRef.current = worker;
        setWorkerReady(true);
      } catch (e) {
        console.error("Failed to initialize Tesseract worker", e);
      }
    };
    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const closeScanner = () => {
    stopLiveScan();
    navigate('/');
  };

  const checkParsedData = (text: string) => {
    const parsedList = extractMultipleTransactions(text);
    if (parsedList.length > 0) {
      setParsedDataList(parsedList);
      stopLiveScan();
      return true;
    }
    return false;
  };

  const processSingleImage = async (imageSrc: string) => {
    setError(null);
    setParsedDataList([]);
    setExtractedText('');
    setAccumulatedText('');
    setSelectedImage(imageSrc);
    setIsProcessing(true);

    try {
      let text = '';
      if (workerRef.current) {
        const result = await workerRef.current.recognize(imageSrc);
        text = result.data.text;
      } else {
        const result = await Tesseract.recognize(imageSrc, 'eng');
        text = result.data.text;
      }
      
      setExtractedText(text);
      if (!checkParsedData(text)) {
        setError("Could not fully extract transaction details. Try live scan if the message is too long.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to read text from image. Please try again with a clearer photo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processFrameLive = async () => {
    if (!webcamRef.current || !workerRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const result = await workerRef.current.recognize(imageSrc);
      const newText = result.data.text;
      
      setAccumulatedText(prev => {
        const updatedText = prev + " \n " + newText;
        checkParsedData(updatedText);
        return updatedText;
      });
    } catch (err) {
      console.error("Live scan frame error:", err);
    }
  };

  const toggleLiveScan = () => {
    if (isLiveScanning) {
      stopLiveScan();
    } else {
      startLiveScan();
    }
  };

  const startLiveScan = () => {
    setError(null);
    setParsedDataList([]);
    setAccumulatedText('');
    setExtractedText('');
    setSelectedImage(null);
    setIsLiveScanning(true);
    
    // Process a frame immediately, then every 1.5 seconds
    processFrameLive();
    scanIntervalRef.current = setInterval(processFrameLive, 1500);
  };

  const stopLiveScan = () => {
    setIsLiveScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  const captureSingle = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        processSingleImage(imageSrc);
      }
    }
  }, [webcamRef]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        processSingleImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (parsedDataList.length === 0) return;
    
    try {
      const txsToAdd = [];
      for (let i = 0; i < parsedDataList.length; i++) {
        const parsedData = parsedDataList[i];
        if (duplicateStatuses[i]) continue; // Skip duplicates
        
        const type = parsedData.transaction_type === 'deposit' ? 'income' : 'expense';
        const categoryName = parsedData.transaction_type.charAt(0).toUpperCase() + parsedData.transaction_type.slice(1);
        let txDate = new Date().toISOString();
        if (parsedData.date) {
          txDate = parseTransactionDate(parsedData.date, parsedData.time);
        }

        txsToAdd.push({
          amount: parsedData.amount || 0,
          type,
          category: categoryName,
          note: `Scanned from another phone`, // Could be improved if we knew which chunk
          date: txDate,
          createdAt: new Date().toISOString(),
          tid: parsedData.transaction_id,
          senderReceiverName: parsedData.sender_name || parsedData.receiver_name || undefined,
          smsDate: parsedData.date || undefined,
          smsTime: parsedData.time || undefined,
          currency: parsedData.currency || undefined,
          phoneNumber: parsedData.phone_number || undefined,
          balance: parsedData.balance || undefined,
          fee: parsedData.fee || undefined,
          provider: parsedData.provider || undefined,
          rawMessage: parsedData.raw_message
        });
      }

      if (txsToAdd.length > 0) {
        await db.transactions.bulkAdd(txsToAdd);
      }
      
      closeScanner();
    } catch (err) {
      console.error(err);
      setError("Failed to save transaction.");
    }
  };

  const resetScanner = () => {
    setSelectedImage(null);
    setParsedDataList([]);
    setExtractedText('');
    setAccumulatedText('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUserMedia = () => setCameraPermission(true);
  const handleUserMediaError = () => setCameraPermission(false);

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-800 p-4 sticky top-0 z-20 flex items-center justify-between h-[72px]">
        <div className="flex items-center">
          <button onClick={closeScanner} className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white ml-2 flex-1">Scan SMS</h1>
        </div>
        {isLiveScanning && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full animate-pulse">
            <div className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full"></div>
            <span className="text-xs font-bold uppercase tracking-wider">Scanning Live</span>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        {!selectedImage && parsedDataList.length === 0 ? (
          <div className="w-full max-w-md flex flex-col h-full space-y-4">
            <div className="bg-black rounded-2xl overflow-hidden shadow-sm relative flex-1 flex flex-col justify-center min-h-[50vh]">
              {cameraPermission === false ? (
                <div className="text-white p-6 text-center">
                  <p className="mb-4 text-red-400 font-semibold">Camera Access Denied</p>
                  <p className="text-sm text-gray-400 mb-6">Please allow camera permissions in your browser settings to use the live scanner.</p>
                </div>
              ) : (
                // @ts-ignore: React-webcam types are occasionally overly strict
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={1}
                  videoConstraints={{ facingMode }}
                  onUserMedia={handleUserMedia}
                  onUserMediaError={handleUserMediaError}
                  className="w-full h-full object-cover absolute inset-0"
                  style={{ minHeight: '100%' }}
                />
              )}
              
              {/* Overlay guides */}
              {cameraPermission !== false && (
                <div className={`absolute inset-0 pointer-events-none border-2 m-6 rounded-xl flex flex-col items-center justify-center transition-colors ${isLiveScanning ? 'border-red-500/70 bg-red-500/10' : 'border-white/20'}`}>
                  {isLiveScanning ? (
                    <div className="text-center bg-black/60 p-4 rounded-xl backdrop-blur-sm mx-4 transform transition-all">
                      <p className="text-white font-medium mb-1">Live Scan Active</p>
                      <p className="text-white/70 text-sm">Slowly scroll the SMS down on the other phone...</p>
                    </div>
                  ) : (
                    <span className="text-white/50 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">Align SMS within frame</span>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex justify-center gap-4 relative z-10 shrink-0 flex-wrap">
              <p className="w-full text-center text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">
                If your mobile money message is in another phone, open the message and use Live Scan. Point your camera at it and slowly scroll down to capture all details.
              </p>
              
              <button 
                onClick={toggleLiveScan}
                disabled={cameraPermission === false || !workerReady}
                className={`flex-[2] flex flex-col items-center justify-center space-y-1 ${isLiveScanning ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800/50' : 'bg-blue-600 hover:bg-blue-700 text-white'} disabled:opacity-50 font-semibold py-3 px-2 rounded-xl shadow-sm transition-colors min-w-[120px]`}
              >
                {!workerReady ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : isLiveScanning ? (
                  <StopCircle className="w-6 h-6" />
                ) : (
                  <PlayCircle className="w-6 h-6" />
                )}
                <span className="text-sm">{!workerReady ? 'Loading...' : isLiveScanning ? 'Stop Live Scan' : 'Live Scan'}</span>
              </button>

              <div className="flex flex-col gap-2 flex-1 min-w-[100px]">
                <button 
                  onClick={captureSingle}
                  disabled={cameraPermission === false || isLiveScanning}
                  className="flex flex-1 items-center justify-center space-x-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 disabled:opacity-50 font-semibold py-2 rounded-lg transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-xs">Take Photo</span>
                </button>
                <label className="flex flex-1 items-center justify-center space-x-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 disabled:opacity-50 font-semibold py-2 rounded-lg cursor-pointer transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  <span className="text-xs">Gallery</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} ref={fileInputRef} disabled={isLiveScanning} />
                </label>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-md space-y-6">
            {selectedImage && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="aspect-video bg-gray-900 relative">
                  <img src={selectedImage} alt="Scanned SMS" className="w-full h-full object-contain" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4">
                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                      <p className="font-medium text-center">Reading text... This may take a few seconds.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && !isProcessing && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800">
                <p className="font-medium mb-1">Failed to parse transaction</p>
                <p className="text-sm opacity-90">{error}</p>
                <button 
                  onClick={resetScanner}
                  className="mt-3 text-red-700 dark:text-red-300 font-semibold text-sm underline"
                >
                  Try Again
                </button>
              </div>
            )}

            {parsedDataList.length > 0 && !isProcessing && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                    {parsedDataList.length} Transaction{parsedDataList.length > 1 ? 's' : ''} Found!
                  </h3>
                </div>

                <div className="max-h-[40vh] overflow-y-auto space-y-4 mb-6 pr-2">
                  {parsedDataList.map((parsedData, index) => {
                    const isDuplicate = duplicateStatuses[index];
                    return (
                      <div key={index} className={`p-4 rounded-xl border ${isDuplicate ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                            ${parsedData.transaction_type === 'deposit' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}
                          `}>
                            {parsedData.transaction_type}
                          </div>
                          <div className="text-lg font-bold dark:text-white">
                            {parsedData.currency} {parsedData.amount?.toLocaleString()}
                          </div>
                        </div>

                        {parsedData.sender_name && (
                          <div className="text-sm text-gray-600 dark:text-gray-300 flex justify-between mt-1">
                            <span className="text-gray-400">From</span> 
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{parsedData.sender_name}</span>
                          </div>
                        )}
                        {parsedData.receiver_name && (
                          <div className="text-sm text-gray-600 dark:text-gray-300 flex justify-between mt-1">
                            <span className="text-gray-400">To</span> 
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{parsedData.receiver_name}</span>
                          </div>
                        )}
                        {parsedData.transaction_id && (
                          <div className="text-sm text-gray-600 dark:text-gray-300 flex justify-between mt-1">
                            <span className="text-gray-400">TID</span> 
                            <span className="font-mono text-gray-800 dark:text-gray-200">{parsedData.transaction_id}</span>
                          </div>
                        )}

                        {isDuplicate && (
                          <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Already saved
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={resetScanner}
                    className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={parsedDataList.length > 0 && duplicateStatuses.every(status => status)}
                    className={`flex-[2] py-3 px-4 font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 ${
                      parsedDataList.length > 0 && duplicateStatuses.every(status => status)
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <Check className="w-5 h-5" />
                    {(parsedDataList.length > 0 && duplicateStatuses.every(status => status)) ? 'All Saved' : `Save ${parsedDataList.filter((_, i) => !duplicateStatuses[i]).length > 1 ? 'All ' : ''}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
