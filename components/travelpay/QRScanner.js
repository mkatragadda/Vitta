/**
 * QRScanner — live camera QR detection.
 *
 * Path A: BarcodeDetector (Chrome Android/desktop, Edge)
 *   BarcodeDetector is NOT in iOS Safari (any version). iOS always takes Path B.
 *
 * Path B: jsqr on canvas frames (iOS Safari, Firefox, all others)
 *   Own RAF loop — does NOT use html5-qrcode, which stalls on iOS Safari.
 *   Center-crops the 16:9 video to a square (matching the viewfinder)
 *   before scaling to the canvas, giving jsqr ~2× effective resolution.
 *   Two decode passes: standard grayscale + binary threshold for screens.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

const NATIVE_DETECT = typeof window !== 'undefined' && 'BarcodeDetector' in window;

// Canvas size for frame decoding. 512 is enough for all common QR densities
// while keeping per-frame ImageData allocation under 1 MB.
const CANVAS_PX = 512;

const CONSTRAINTS = [
  { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
  { facingMode: 'environment' },
  true, // any camera
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
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function acquireStream() {
    for (const constraint of CONSTRAINTS) {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: constraint, audio: false });
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') throw err;
        // OverconstrainedError — try next constraint
      }
    }
    throw new Error('no-camera');
  }

  async function attachVideo(stream) {
    streamRef.current = stream;
    const vid = videoRef.current;
    if (!vid) throw new Error('no-video-ref');

    // webkit-playsinline is required for inline video on iOS < 10
    vid.setAttribute('webkit-playsinline', 'true');
    vid.playsInline = true;
    vid.muted       = true;
    vid.srcObject   = stream;

    // Wait for the video to actually start producing frames.
    // On iOS Safari, readyState often stays at 3 (HAVE_FUTURE_DATA) and never
    // reaches 4 (HAVE_ENOUGH_DATA), so we must listen for 'canplay'/'playing'
    // rather than polling readyState.
    await new Promise((resolve) => {
      if (vid.readyState >= 3) { resolve(); return; }
      const done = () => resolve();
      vid.addEventListener('canplay',  done, { once: true });
      vid.addEventListener('playing',  done, { once: true });
      setTimeout(resolve, 2500); // hard fallback
    });

    await vid.play().catch(() => {});

    // Give iOS Safari one extra tick to expose videoWidth after play() starts
    await new Promise(r => setTimeout(r, 200));
  }

  // ── Path A: BarcodeDetector (Chrome family) ──────────────────────────────

  async function startNative() {
    try {
      const stream = await acquireStream();
      if (!aliveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      await attachVideo(stream);
      if (!aliveRef.current) return;

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const vid      = videoRef.current;

      const tick = async () => {
        if (!aliveRef.current) return;
        try {
          const codes = await detector.detect(vid);
          if (codes.length > 0) {
            stopAll();
            onScanSuccess({ raw: codes[0].rawValue });
            return;
          }
        } catch (_) {}
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

    } catch (err) {
      if (!aliveRef.current) return;
      setError(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Camera access denied. Enable camera permissions or use Manual entry.'
        : 'Could not access camera. Use Manual entry instead.');
    }
  }

  // ── Path B: jsqr on canvas frames (iOS Safari / all non-BarcodeDetector) ──

  async function startJsqr() {
    let jsQR;
    try {
      jsQR = (await import('jsqr')).default;
    } catch {
      if (aliveRef.current) setError('Could not load QR scanner. Use Manual entry instead.');
      return;
    }

    try {
      const stream = await acquireStream();
      if (!aliveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      await attachVideo(stream);
      if (!aliveRef.current) return;

      const vid    = videoRef.current;
      const canvas = canvasRef.current;
      const ctx    = canvas.getContext('2d');
      if (!ctx) { setError('Canvas unavailable. Use Manual entry instead.'); return; }

      let lastMs = 0;
      const INTERVAL = 100; // ~10 fps — enough to scan without overloading iOS CPU

      const tick = (now) => {
        if (!aliveRef.current) return;

        if (now - lastMs >= INTERVAL) {
          lastMs = now;

          // Center-crop: extract the square region from the middle of the video
          // frame (the area the viewfinder UI is actually showing), then scale to
          // the canvas. This gives jsqr ~2× the effective resolution compared to
          // squishing the whole 16:9 frame into a square.
          const vw   = vid.videoWidth  || 0;
          const vh   = vid.videoHeight || 0;

          if (vw > 0 && vh > 0) {
            const side = Math.min(vw, vh);
            const sx   = (vw - side) / 2;
            const sy   = (vh - side) / 2;

            try {
              ctx.drawImage(vid, sx, sy, side, side, 0, 0, CANVAS_PX, CANVAS_PX);
            } catch (_) {
              // video not fully ready for this frame — skip, try next tick
              rafRef.current = requestAnimationFrame(tick);
              return;
            }

            const imgData = ctx.getImageData(0, 0, CANVAS_PX, CANVAS_PX);

            // Pass 1: standard grayscale
            let code = jsQR(imgData.data, CANVAS_PX, CANVAS_PX, { inversionAttempts: 'attemptBoth' });

            // Pass 2: binary threshold — converts overexposed/screen-lit pixels
            // (which appear as mid-gray) into hard black/white.  This is the key
            // unlock for QR codes displayed on a bright monitor screen.
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
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

    } catch (err) {
      if (!aliveRef.current) return;
      setError(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Camera access denied. Enable camera permissions or use Manual entry.'
        : 'Could not access camera. Use Manual entry instead.');
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

  // Both paths use the same <video> element.
  // The <canvas> is hidden and used only by Path B for per-frame jsqr processing.
  return (
    <>
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_PX}
        height={CANVAS_PX}
        style={{ display: 'none' }}
      />
    </>
  );
}
