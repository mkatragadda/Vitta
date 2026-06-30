/**
 * QRScanner — live camera QR detection.
 *
 * Two code paths, selected once at module load based on API availability:
 *
 * A) BarcodeDetector (iOS 17+, Chrome Android, Chrome desktop)
 *    getUserMedia → <video> → rAF loop calling BarcodeDetector.detect(video).
 *    The OS-native QR engine; far more reliable on iPhone than html5-qrcode's
 *    JS frame-extraction loop, which stalls on iOS Safari after getUserMedia.
 *
 * B) html5-qrcode fallback (iOS 14-16, Firefox, Samsung Browser, etc.)
 *    Tries { facingMode: 'environment' } then any camera.
 *    Requires a <div id="qr-reader"> in the DOM before start() is called.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

const NATIVE_DETECT = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export default function QRScanner({ onScanSuccess }) {
  const [error, setError] = useState(null);
  const videoRef          = useRef(null);
  const streamRef         = useRef(null);
  const rafRef            = useRef(null);
  const h5Ref             = useRef(null);
  const h5StartedRef      = useRef(false);
  const aliveRef          = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    if (NATIVE_DETECT) startNative();
    else               startLegacy();
    return () => {
      aliveRef.current = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAll() {
    if (rafRef.current)  { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (h5Ref.current && h5StartedRef.current) {
      h5StartedRef.current = false;
      h5Ref.current.stop().catch(() => {});
      h5Ref.current = null;
    }
  }

  // ── Path A: BarcodeDetector + native video ───────────────────────────────

  async function startNative() {
    // Try back camera first, fall back to any camera if constrained
    for (const videoConstraint of [
      { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      { facingMode: 'environment' },
      true,  // any camera
    ]) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });

        if (!aliveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const vid = videoRef.current;
        if (!vid) return;

        vid.srcObject   = stream;
        vid.playsInline = true;
        vid.muted       = true;
        await vid.play().catch(() => {});

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

        const tick = async () => {
          if (!aliveRef.current) return;
          if (vid.readyState >= vid.HAVE_ENOUGH_DATA && vid.videoWidth > 0) {
            try {
              const codes = await detector.detect(vid);
              if (codes.length > 0) {
                stopAll();
                onScanSuccess({ raw: codes[0].rawValue });
                return;
              }
            } catch (_) {}
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return; // success — don't try next constraint

      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          // Permission is terminal — no point retrying with a different constraint
          if (aliveRef.current)
            setError('Camera access denied. Enable camera permissions or use Manual entry.');
          return;
        }
        // OverconstrainedError or other — try next constraint in loop
      }
    }

    // All constraints exhausted
    if (aliveRef.current)
      setError('Camera access denied. Enable camera permissions or use Manual entry.');
  }

  // ── Path B: html5-qrcode fallback ───────────────────────────────────────

  async function startLegacy() {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!aliveRef.current) return;

      const scanner = new Html5Qrcode('qr-reader');
      h5Ref.current = scanner;

      for (const cam of [{ facingMode: 'environment' }, { facingMode: 'user' }]) {
        try {
          await scanner.start(
            cam,
            { fps: 10, qrbox: { width: 200, height: 200 } },
            (text) => {
              if (!aliveRef.current) return;
              h5StartedRef.current = false;
              scanner.stop().catch(() => {});
              onScanSuccess({ raw: text });
            },
            () => {},  // per-frame "no QR" — normal, ignore
          );
          h5StartedRef.current = true;
          return;
        } catch (_) {}
      }

      if (aliveRef.current)
        setError('Camera access denied. Enable camera permissions or use Manual entry.');
    } catch {
      if (aliveRef.current)
        setError('Camera access denied. Enable camera permissions or use Manual entry.');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', padding: '0 12px', textAlign: 'center',
      }}>
        <AlertCircle size={28} color="#f87171" style={{ marginBottom: 8 }} />
        <p style={{ color: '#f87171', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (NATIVE_DETECT) {
    return (
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
        playsInline
        muted
        autoPlay
      />
    );
  }

  return <div id="qr-reader" style={{ width: '100%', height: '100%' }} />;
}
