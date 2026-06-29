import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle } from 'lucide-react';

export default function QRScanner({ onScanSuccess }) {
  const [error, setError] = useState(null);
  const instanceRef  = useRef(null);
  const startedRef   = useRef(false);
  // Tracks whether the component unmounted before start() resolved.
  // If true, the scanner must be stopped inside the .then() handler
  // because the normal cleanup already ran and found nothing to stop.
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

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
        () => {
          // Per-frame "no QR found" callback — fires 10×/s during normal scanning.
          // Completely normal; never log or act on these.
        }
      )
      .then(() => {
        if (cancelledRef.current) {
          // Component unmounted while start() was in-flight.
          // Cleanup already ran and couldn't stop (startedRef was false).
          // Stop the now-orphaned scanner here before it runs forever.
          html5QrCode.stop().catch(() => {});
          return;
        }
        startedRef.current = true;
      })
      .catch((err) => {
        if (!cancelledRef.current) {
          console.error('[QRScanner] camera start failed:', err);
          setError('Camera access denied. Enable camera permissions or use Manual entry.');
        }
      });

    return () => {
      cancelledRef.current = true;
      safeStop();
    };
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 12px', textAlign: 'center' }}>
        <AlertCircle size={28} color="#f87171" style={{ marginBottom: 8 }} />
        <p style={{ color: '#f87171', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{error}</p>
      </div>
    );
  }

  return <div id="qr-reader" style={{ width: '100%', height: '100%' }} />;
}
