import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle } from 'lucide-react';

// Pure camera-feed component — no fixed overlay, no own header.
// ScannerScreen controls layout and navigation.
export default function QRScanner({ onScanSuccess }) {
  const [error, setError] = useState(null);
  const instanceRef = useRef(null);
  const startedRef  = useRef(false);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode('qr-reader');
    instanceRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          safeStop();
          onScanSuccess({ raw: decodedText });
        },
        (err) => {
          if (!err.includes('No QR code found')) console.warn('[QRScanner]', err);
        }
      )
      .then(() => { startedRef.current = true; })
      .catch((err) => {
        console.error('[QRScanner] start failed:', err);
        setError('Camera access denied. Please enable camera permissions or use Manual entry.');
      });

    return () => { safeStop(); };
  }, []);

  function safeStop() {
    if (!startedRef.current) return;
    startedRef.current = false;
    try {
      instanceRef.current?.stop().catch(() => {});
    } catch (_) { /* already stopped */ }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <AlertCircle className="w-7 h-7 text-red-400 mb-2" />
        <p className="text-red-400 text-xs leading-relaxed">{error}</p>
      </div>
    );
  }

  return <div id="qr-reader" className="w-full h-full" />;
}
