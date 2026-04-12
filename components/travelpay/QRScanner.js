import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle } from 'lucide-react';

export default function QRScanner({ onScanSuccess, onClose }) {
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    startScanner();
    return () => stopScanner();
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: "environment" }, // Back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        handleScanError
      );

      setIsScanning(true);
      setError(null);
    } catch (err) {
      console.error('[QRScanner] Failed to start:', err);
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch (err) {
        console.error('[QRScanner] Stop error:', err);
      }
    }
  };

  const handleScanSuccess = async (decodedText) => {
    console.log('[QRScanner] Scanned:', decodedText);

    // Stop scanner before processing
    await stopScanner();

    // Pass raw QR data to parent
    onScanSuccess({ raw: decodedText });
  };

  const handleScanError = (errorMessage) => {
    // Suppress "No QR code found" errors (normal during scanning)
    if (!errorMessage.includes('No QR code found')) {
      console.warn('[QRScanner]:', errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex items-center justify-between text-white">
          <h2 className="text-lg font-semibold">Scan UPI QR Code</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Scanner Area */}
      <div id="qr-reader" className="w-full h-full flex items-center justify-center"></div>

      {/* Instructions/Error */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 z-10">
        <div className="text-center text-white">
          {!error && isScanning && (
            <>
              <Camera className="w-12 h-12 mx-auto mb-4 opacity-60" />
              <p className="text-sm opacity-80">
                Position the QR code within the frame
              </p>
            </>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
