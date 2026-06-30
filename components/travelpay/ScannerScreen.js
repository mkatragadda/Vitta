import React, { useState, useRef } from 'react';
import { X, Keyboard, Camera, Image } from 'lucide-react';
import QRScanner from './QRScanner';

// ── QR decode helpers ──────────────────────────────────────────────────────

// ZXing via html5-qrcode with a throwaway div per call (avoids "already
// initialised" error when called multiple times concurrently).
async function decodeWithZxing(file) {
  const { Html5Qrcode } = await import('html5-qrcode');
  const divId = `qr-decode-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const div   = document.createElement('div');
  div.id = divId;
  div.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
  document.body.appendChild(div);
  try {
    return await new Html5Qrcode(divId).scanFile(file, false);
  } finally {
    try { document.body.removeChild(div); } catch (_) {}
  }
}

// Load File into <img> (applies EXIF rotation) → canvas at target px (PNG).
// PNG avoids double-JPEG-compression artifacts; bail after 10 s on mobile.
function prepareCanvas(file, targetPx) {
  return new Promise((resolve, reject) => {
    const bail = setTimeout(() => reject(new Error('canvas-timeout')), 10000);
    const reader = new FileReader();
    reader.onerror = () => { clearTimeout(bail); reject(new Error('FileReader error')); };
    reader.onload  = (ev) => {
      const img = new window.Image();
      img.onerror = () => { clearTimeout(bail); reject(new Error('Image load error')); };
      img.onload  = () => {
        const scale  = Math.min(1, targetPx / Math.max(img.naturalWidth, img.naturalHeight));
        const w      = Math.round(img.naturalWidth  * scale);
        const h      = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        clearTimeout(bail);
        resolve({ canvas, w, h });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Convert canvas to a File object (PNG, no quality loss).
function canvasToFile(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], 'qr.png', { type: 'image/png' }));
      else      reject(new Error('toBlob failed'));
    }, 'image/png');
  });
}

// Extract UPI ID string from a decoded QR value (URL or bare VPA).
function extractUpiId(text) {
  if (!text) return null;
  try {
    if (text.startsWith('upi://')) {
      return new URLSearchParams(new URL(text).search).get('pa') || null;
    }
  } catch (_) {}
  return (text.includes('@') && !text.startsWith('upi://')) ? text.trim() : null;
}

function isUpiId(value) {
  const t = (value || '').trim();
  return t.includes('@') && !t.startsWith('upi://');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ScannerScreen({ onScanSuccess, onClose }) {
  const [mode, setMode]             = useState('camera');
  const [manualInput, setManualInput] = useState('');
  const [decodedPayeeName, setDecodedPayeeName] = useState('');
  const [error, setError]           = useState('');
  const [uploading, setUploading]   = useState(false);
  const fileInputRef = useRef(null);

  const inputIsUpiId = isUpiId(manualInput);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setError('');
    const trimmed = manualInput.trim();
    if (!trimmed) { setError('Please enter a UPI ID or UPI URL'); return; }

    if (inputIsUpiId) {
      onScanSuccess({ raw: `upi://pay?pa=${encodeURIComponent(trimmed)}&cu=INR` });
      return;
    }
    if (!trimmed.startsWith('upi://pay')) {
      setError('Enter a UPI ID (e.g. name@bank) or a full UPI URL starting with "upi://pay"');
      return;
    }
    onScanSuccess({ raw: trimmed });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    // Run all decoders in parallel — do NOT short-circuit on first hit.
    // Different algorithms handle logo-overlay and JPEG-artifact QRs
    // differently; collecting all results lets us pick the best one.
    const decode = async () => {
      const results = await Promise.allSettled([

        // ── A: BarcodeDetector (iOS 17+, Chrome 83+) ─────────────────────
        // Native OS QR reader — fastest but uses the same ZXing engine as B.
        (async () => {
          if (!('BarcodeDetector' in window)) return null;
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const bitmap   = await createImageBitmap(file);
          const codes    = await detector.detect(bitmap);
          return codes.length > 0 ? codes[0].rawValue : null;
        })(),

        // ── B: EXIF-corrected PNG → ZXing ─────────────────────────────────
        // Output as PNG (no extra JPEG artifacts) at ≤1024 px.
        // ZXing has strong Reed-Solomon ECC and handles logo-overlay QRs well.
        (async () => {
          const { canvas, w, h } = await prepareCanvas(file, 1024);
          const pngFile = await canvasToFile(canvas);
          return decodeWithZxing(pngFile);
        })(),

        // ── C: ZXing on the raw original file ─────────────────────────────
        // Separate attempt without EXIF correction / rescaling.
        decodeWithZxing(file),

        // ── D: jsqr with standard grayscale ──────────────────────────────
        (async () => {
          const jsQR = (await import('jsqr')).default;
          const { canvas, w, h } = await prepareCanvas(file, 1024);
          const ctx  = canvas.getContext('2d');
          const raw  = ctx.getImageData(0, 0, w, h);
          const code = jsQR(raw.data, w, h, { inversionAttempts: 'attemptBoth' });
          return code?.data || null;
        })(),

        // ── E: jsqr with binary threshold ─────────────────────────────────
        // Binarise with Otsu-inspired adaptive threshold.  Genuinely different
        // pixel path compared to D — may recover modules that JPEG blurring
        // makes ambiguous in a continuous-tone image.
        (async () => {
          const jsQR = (await import('jsqr')).default;
          const { canvas, w, h } = await prepareCanvas(file, 1024);
          const ctx  = canvas.getContext('2d');
          const raw  = ctx.getImageData(0, 0, w, h);

          // Compute mean luminance for threshold
          let sum = 0;
          for (let i = 0; i < raw.data.length; i += 4) {
            sum += raw.data[i] * 0.299 + raw.data[i+1] * 0.587 + raw.data[i+2] * 0.114;
          }
          const threshold = sum / (raw.data.length / 4);

          for (let i = 0; i < raw.data.length; i += 4) {
            const lum = raw.data[i] * 0.299 + raw.data[i+1] * 0.587 + raw.data[i+2] * 0.114;
            const bw  = lum < threshold ? 0 : 255;
            raw.data[i] = raw.data[i+1] = raw.data[i+2] = bw;
            raw.data[i+3] = 255;
          }
          ctx.putImageData(raw, 0, 0);
          const bin = ctx.getImageData(0, 0, w, h);
          const code = jsQR(bin.data, w, h, { inversionAttempts: 'attemptBoth' });
          return code?.data || null;
        })(),
      ]);

      // Collect all non-null decoded strings
      const candidates = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);

      if (candidates.length === 0) return null;

      // Majority vote on the UPI ID part (bank handle is where errors occur)
      const upiIdCounts = {};
      const upiIdToCandidate = {};
      for (const c of candidates) {
        const uid = extractUpiId(c);
        if (!uid) continue;
        upiIdCounts[uid] = (upiIdCounts[uid] || 0) + 1;
        // Prefer a full UPI URL candidate over a bare ID for metadata
        if (!upiIdToCandidate[uid] || c.startsWith('upi://')) {
          upiIdToCandidate[uid] = c;
        }
      }

      if (Object.keys(upiIdCounts).length === 0) return candidates[0];

      // Sort by vote count desc, then alphabetically for determinism
      const ranked = Object.entries(upiIdCounts)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

      // Use the majority winner (or the sole result if unanimous)
      const winnerUpiId = ranked[0][0];
      return upiIdToCandidate[winnerUpiId];
    };

    try {
      const qrCodeText = await Promise.race([
        decode(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('DECODE_TIMEOUT')), 25000)),
      ]);

      if (qrCodeText) {
        const upiId = extractUpiId(qrCodeText);
        if (upiId) {
          // Extract payee name for display when available
          try {
            const pn = new URLSearchParams(new URL(qrCodeText).search).get('pn');
            if (pn) setDecodedPayeeName(decodeURIComponent(pn));
          } catch (_) {}

          // Show just the UPI ID for easy verification/editing
          setManualInput(upiId);
          setError('');
        } else {
          setError('Image decoded but no UPI QR code found. Enter the UPI ID manually.');
        }
      } else {
        setError('Could not read QR code. Make sure the full QR is visible and well-lit, or enter the UPI ID manually.');
      }
    } catch (err) {
      if (err.message === 'DECODE_TIMEOUT') {
        setError('QR decode timed out. Try a clearer image or enter the UPI ID manually.');
      } else {
        console.error('[ScannerScreen] QR image decode error:', err);
        setError('Failed to read image. Please try another photo or enter the UPI ID manually.');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 pt-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white font-semibold">Scan UPI QR</h2>
          <div className="w-11"></div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="absolute top-20 left-0 right-0 z-20 px-6">
        <div className="flex gap-2 bg-black/80 backdrop-blur rounded-2xl p-1.5 shadow-xl">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium ${
              mode === 'camera'
                ? 'bg-teal-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="text-sm">Camera</span>
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-medium ${
              mode === 'manual'
                ? 'bg-teal-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span className="text-sm">Manual</span>
          </button>
        </div>
      </div>

      {/* Camera Mode */}
      {mode === 'camera' && (
        <>
          <div className="flex-1 flex items-center justify-center mt-32">
            <div className="relative w-72 h-72">
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-teal-500 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-teal-500 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-teal-500 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-teal-500 rounded-br-3xl"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="scan-line w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent shadow-lg shadow-teal-500/50"></div>
              </div>
              <div className="absolute inset-0">
                <QRScanner onScanSuccess={onScanSuccess} />
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
            <div className="glass-teal rounded-3xl p-6 text-center border border-teal-500/30">
              <h3 className="text-white font-bold text-lg mb-2">Point at UPI QR Code</h3>
              <p className="text-slate-300 text-sm mb-4">Your USD will convert to INR instantly</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-emerald-400 text-xs font-semibold">Ready to scan</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manual / Image Upload Mode */}
      {mode === 'manual' && (
        <div className="flex-1 flex items-center justify-center px-6 mt-32">
          <div className="w-full max-w-md">
            <form onSubmit={handleManualSubmit} className="space-y-4">

              {/* Decoded payee name banner */}
              {decodedPayeeName && (
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl px-4 py-3">
                  <p className="text-teal-300 text-xs font-semibold uppercase mb-0.5">Paying to (from QR)</p>
                  <p className="text-white text-sm font-medium">{decodedPayeeName}</p>
                </div>
              )}

              {/* UPI ID input */}
              <div>
                <label className="text-white text-sm font-semibold mb-2 block">
                  {decodedPayeeName ? 'UPI ID — verify before continuing' : 'Enter UPI ID or UPI URL'}
                </label>
                <textarea
                  value={manualInput}
                  onChange={(e) => { setManualInput(e.target.value); setError(''); setDecodedPayeeName(''); }}
                  placeholder={'name@bank  or  upi://pay?pa=name@bank&am=500&cu=INR'}
                  className="w-full bg-white/10 backdrop-blur border border-teal-500/30 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono text-sm"
                  rows={decodedPayeeName ? 1 : 3}
                />
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                {decodedPayeeName && !error && (
                  <p className="text-amber-400 text-xs mt-2 leading-relaxed">
                    ⚠ Auto-decoded from QR — please verify the UPI ID is correct. QRs with logo overlays can occasionally be mis-read.
                  </p>
                )}
                {inputIsUpiId && !decodedPayeeName && !error && (
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                    UPI ID entered. Identity is verified by your payment app before you approve.
                  </p>
                )}
              </div>

              {/* Upload QR Image */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="qr-image-upload"
                />
                <label
                  htmlFor="qr-image-upload"
                  className="w-full py-3 rounded-xl bg-white/10 backdrop-blur border border-teal-500/30 text-white text-sm font-semibold hover:bg-white/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Decoding QR Code…</span>
                    </>
                  ) : (
                    <>
                      <Image className="w-4 h-4" />
                      <span>Upload QR Code Image</span>
                    </>
                  )}
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-white font-bold shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50 transition-all"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
