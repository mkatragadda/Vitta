/**
 * QRScanner — live camera QR detection.
 *
 * Two code paths, selected once at module load:
 *
 * A) BarcodeDetector (Chrome Android/desktop, Edge)
 *    getUserMedia → <video> → rAF calling BarcodeDetector.detect(video).
 *    NOTE: BarcodeDetector is NOT in iOS Safari (any version), so iOS always
 *    takes Path B.
 *
 * B) jsqr on canvas frames (iOS Safari, Firefox, Samsung Browser, etc.)
 *    getUserMedia → <video> → rAF @ ~10 fps drawing the video frame to a
 *    hidden canvas → jsqr decode (standard + binary-threshold pass for
 *    screen/glare scenarios). We own the frame loop so it doesn't stall the
 *    way html5-qrcode's JS timer does on iOS Safari.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

// BarcodeDetector is available in Chrome family but NOT in any version of iOS Safari.
const NATIVE_DETECT = typeof window !== 'undefined' && 'BarcodeDetector' in window;

// Canvas resolution for frame decoding. 512px gives jsqr enough detail for
// most QR codes (including screen-displayed ones) without OOMing on mobile.
const CANVAS_PX = 512;

// Camera constraints to try in order: back camera HD → back camera → any.
const CONSTRAINTS = [
  { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
  { facingMode: 'environment' },
  true,
];

export default function QRScanner({ onScanSuccess }) {
  const [error, setError] = useState(null);
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const aliveRef  = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    if (NATIVE_DETECT) startNative();
    else               startJsqr();
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
  }

  /** Acquire camera stream, trying each constraint in order. */
  async function acquireStream() {
    for (const constraint of CONSTRAINTS) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: constraint, audio: false });
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw err; // permission denied — no point retrying
        }
        // OverconstrainedError or other — try next constraint
      }
    }
    throw new Error('no-camera');
  }

  /** Attach stream to video element and wait for it to be ready to paint. */
  async function attachVideo(stream) {
    streamRef.current = stream;
    const vid = videoRef.current;
    if (!vid) throw new Error('no-video-ref');
    vid.srcObject   = stream;
    vid.playsInline = true;
    vid.muted       = true;
    await vid.play().catch(() => {});
  }

  // ── Path A: BarcodeDetector (Chrome family) ─────────────────────────────

  async function startNative() {
    try {
      const stream = await acquireStream();
      if (!aliveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      await attachVideo(stream);

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const vid      = videoRef.current;

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

    } catch (err) {
      if (!aliveRef.current) return;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Enable camera permissions or use Manual entry.');
      } else {
        setError('Could not access camera. Use Manual entry instead.');
      }
    }
  }

  // ── Path B: jsqr on video frames (iOS Safari, Firefox, etc.) ────────────
  //
  // html5-qrcode's internal timer loop stalls on iOS Safari after getUserMedia.
  // Running our own rAF loop with jsqr on a hidden canvas is more reliable:
  // - We control the frame rate (throttled to ~10 fps)
  // - Binary-threshold pass handles screen glare / overexposure
  // - No dependency on html5-qrcode internals

  async function startJsqr() {
    let jsQR;
    try {
      jsQR = (await import('jsqr')).default;
    } catch {
      if (aliveRef.current)
        setError('Could not load QR scanner. Use Manual entry instead.');
      return;
    }

    try {
      const stream = await acquireStream();
      if (!aliveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      await attachVideo(stream);

      const vid    = videoRef.current;
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext('2d');

      // Throttle to ~10 fps — enough for QR detection without overloading iOS
      let lastMs = 0;
      const INTERVAL = 100;

      const tick = (now) => {
        if (!aliveRef.current) return;

        if (now - lastMs >= INTERVAL
            && vid.readyState >= vid.HAVE_ENOUGH_DATA
            && vid.videoWidth > 0) {
          lastMs = now;

          // Draw the current video frame into the fixed-size canvas.
          // Squishing a 16:9 feed into a square is fine — QR finder patterns
          // survive mild aspect-ratio distortion.
          ctx.drawImage(vid, 0, 0, CANVAS_PX, CANVAS_PX);
          const imgData = ctx.getImageData(0, 0, CANVAS_PX, CANVAS_PX);

          // Pass 1: standard grayscale jsqr
          let code = jsQR(imgData.data, CANVAS_PX, CANVAS_PX, { inversionAttempts: 'attemptBoth' });

          // Pass 2: binary threshold — turns overexposed/glare-lit pixels from a
          // screen into hard black/white, which is the key unlock for screen QR
          // scanning. Uses mean luminance as the adaptive threshold.
          if (!code?.data) {
            const bin = new Uint8ClampedArray(imgData.data);
            let sum = 0;
            const n = bin.length / 4;
            for (let i = 0; i < bin.length; i += 4) {
              sum += bin[i] * 0.299 + bin[i + 1] * 0.587 + bin[i + 2] * 0.114;
            }
            const thr = sum / n;
            for (let i = 0; i < bin.length; i += 4) {
              const lum = bin[i] * 0.299 + bin[i + 1] * 0.587 + bin[i + 2] * 0.114;
              const bw  = lum < thr ? 0 : 255;
              bin[i] = bin[i + 1] = bin[i + 2] = bw;
              bin[i + 3] = 255;
            }
            code = jsQR(bin, CANVAS_PX, CANVAS_PX, { inversionAttempts: 'attemptBoth' });
          }

          if (code?.data) {
            stopAll();
            onScanSuccess({ raw: code.data });
            return;
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

    } catch (err) {
      if (!aliveRef.current) return;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access denied. Enable camera permissions or use Manual entry.');
      } else {
        setError('Could not access camera. Use Manual entry instead.');
      }
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

  return (
    <>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
        playsInline
        muted
        autoPlay
      />
      {/* Hidden canvas used only by Path B (jsqr) frame processing */}
      <canvas
        ref={canvasRef}
        width={CANVAS_PX}
        height={CANVAS_PX}
        style={{ display: 'none' }}
      />
    </>
  );
}
