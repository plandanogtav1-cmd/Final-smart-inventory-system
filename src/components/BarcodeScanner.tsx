import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Camera, X, Flashlight, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const codeReader = useRef<BrowserMultiFormatReader>();
  const streamRef = useRef<MediaStream>();

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => stopScanning();
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Initialize code reader
      codeReader.current = new BrowserMultiFormatReader();

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera, fallback to front
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });

      streamRef.current = stream;

      // Check if flash is available
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      setHasFlash('torch' in capabilities);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Start decoding
        codeReader.current.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, error) => {
            if (result) {
              const barcode = result.getText();
              onScan(barcode);
              stopScanning();
            }
          }
        );
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in your browser settings and refresh the page.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please ensure your device has a camera.');
      } else if (err.name === 'NotSupportedError') {
        setError('Camera not supported. This feature requires HTTPS connection. Use manual entry below.');
      } else {
        setError('Camera unavailable. On mobile, this requires HTTPS. Use manual entry for now.');
      }
      setIsScanning(false);
      setShowManualEntry(true); // Auto-show manual entry when camera fails
    }
  };

  const stopScanning = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsScanning(false);
    setFlashOn(false);
  };

  const toggleFlash = async () => {
    if (streamRef.current && hasFlash) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !flashOn }]
        });
        setFlashOn(!flashOn);
      } catch (err) {
        console.error('Flash toggle failed:', err);
      }
    }
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode('');
      setShowManualEntry(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <h2 className="text-lg font-semibold">Scan Barcode</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            title="Manual entry for presentations"
          >
            <Keyboard className="w-5 h-5" />
          </button>
          {hasFlash && (
            <button
              onClick={toggleFlash}
              className={`p-2 rounded-lg ${flashOn ? 'bg-yellow-500' : 'bg-gray-700'}`}
            >
              <Flashlight className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="flex-1 relative">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-4">
            <Camera className="w-16 h-16 mb-4 text-gray-400" />
            <p className="text-center text-red-400 mb-4">{error}</p>
            <button
              onClick={startScanning}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Scanning frame */}
                <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <div className="w-full h-0.5 bg-green-400 animate-pulse"></div>
                  </div>
                </div>
                
                <p className="text-white text-center mt-4">
                  Position barcode within the frame
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-900 text-white">
        {showManualEntry ? (
          <div className="space-y-3">
            <p className="text-sm text-center text-gray-300">
              Enter barcode manually (perfect for presentations)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Enter barcode or product code"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded transition-all"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-center text-gray-300">
            Hold your device steady and point the camera at the barcode
            <br />
            <span className="text-blue-400">Tip: Click the keyboard icon for manual entry during presentations</span>
          </p>
        )}
      </div>
    </div>
  );
}