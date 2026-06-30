import React, { useState, useRef } from 'react';
import { X, Keyboard, Camera, Image } from 'lucide-react';
import QRScanner from './QRScanner';

// ── QR decode helpers ──────────────────────────────────────────────────────

/**
 * Load a File into a canvas via blob URL (EXIF-corrected, memory-safe).
 *
 * blob URL avoids copying the entire file into a base64 string (which would
 * be ~1.37× the file size in memory — fatal for a 12MP iPhone JPEG that's
 * already ~5 MB). <img> element applies EXIF rotation automatically on
 * iOS Safari 13+ so the canvas pixels are always right-side-up.
 *
 * targetPx caps the longest dimension; 512 is safe for all iOS canvas limits
 * while providing enough resolution for QR module detection.
 */
function prepareCanvas(file, targetPx = 512) {
  return new Promise((resolve, reject) => {
    const bail   = setTimeout(() => reject(new Error('canvas-timeout')), 10000);
    const blobUrl = URL.createObjectURL(file);
    const img    = new window.Image();   // window.Image = HTMLImageElement (not Lucide icon)

    img.onerror = () => {
      clearTimeout(bail);
      URL.revokeObjectURL(blobUrl);
      reject(new Error('img-load-error'));
    };
    img.onload = () => {
      clearTimeout(bail);
      URL.revokeObjectURL(blobUrl);      // free memory immediately after draw

      const scale  = Math.min(1, targetPx / Math.max(img.naturalWidth, img.naturalHeight));
      const w      = Math.round(img.naturalWidth  * scale);
      const h      = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve({ canvas, w, h });
    };
    img.src = blobUrl;
  });
}

/** Encode canvas as a PNG File (lossless — no extra JPEG artefact layer). */
function canvasToFile(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], 'qr.png', { type: 'image/png' }));
      else      reject(new Error('toBlob-failed'));
    }, 'image/png');
  });
}

/** ZXing via html5-qrcode with a unique off-screen div per call. */
async function decodeWithZxing(file) {
  const { Html5Qrcode } = await import('html5-qrcode');
  const divId = `qr-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

/** Pull the UPI ID out of a decoded QR string (URL or bare VPA). */
function extractUpiId(text) {
  if (!text) return null;
  try {
    if (text.startsWith('upi://')) {
      return new URLSearchParams(new URL(text).search).get('pa') || null;
    }
  } catch (_) {}
  return text.includes('@') && !text.startsWith('upi://') ? text.trim() : null;
}

/**
 * Decode a QR code from a File using sequential strategies.
 *
 * Sequential (not parallel) is critical on mobile: running multiple canvas
 * decode passes in parallel on a high-res iPhone photo causes iOS Safari to
 * exhaust its canvas memory budget and crash the tab silently.
 *
 * A single 512-px canvas is prepared once and reused across all canvas
 * strategies to avoid repeated large allocations.
 */
async function decodeQrFromFile(file) {
  // ── Shared canvas: one allocation, reused by strategies 1–4 ──────────────
  let canvas = null;
  try {
    const prepared = await prepareCanvas(file, 512);
    canvas = prepared.canvas;
  } catch (_) { /* fall through — canvas-free strategies can still run */ }

  // ── Strategy 1: BarcodeDetector on the scaled canvas ─────────────────────
  // Operating on the 512-px canvas avoids iOS's full-res canvas OOM limit.
  // BarcodeDetector is the OS-level QR engine (iOS 17+, Chrome Android/desktop).
  if ('BarcodeDetector' in window && canvas) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const bitmap   = await createImageBitmap(canvas);
      const codes    = await detector.detect(bitmap);
      bitmap.close();
      if (codes.length > 0) return codes[0].rawValue;
    } catch (_) {}
  }

  // ── Strategy 2: ZXing on lossless PNG from the canvas ────────────────────
  // ZXing has strong Reed-Solomon ECC and handles logo-overlay QRs well.
  // Passing PNG avoids a second JPEG-compression cycle.
  if (canvas) {
    try {
      const pngFile = await canvasToFile(canvas);
      const result  = await decodeWithZxing(pngFile);
      if (result) return result;
    } catch (_) {}
  }

  // ── Strategy 3: ZXing on original file (small files only) ────────────────
  // Skipped for files > 3 MB because html5-qrcode internally creates a
  // full-resolution canvas that will OOM on iPhone (4032×3024 ≈ 196 MB).
  if (file.size < 3 * 1024 * 1024) {
    try {
      const result = await decodeWithZxing(file);
      if (result) return result;
    } catch (_) {}
  }

  // ── Strategy 4: jsqr on canvas (standard grayscale) ──────────────────────
  if (canvas) {
    try {
      const jsQR = (await import('jsqr')).default;
      const ctx  = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(data.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) return code.data;
    } catch (_) {}
  }

  // ── Strategy 5: jsqr with binary threshold (different pixel path) ─────────
  // Binarising with an adaptive mean threshold sharpens ambiguous JPEG-blurred
  // module edges, giving jsqr a different set of bits to error-correct from.
  if (canvas) {
    try {
      const jsQR  = (await import('jsqr')).default;
      const ctx   = canvas.getContext('2d');
      const orig  = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const bin   = new ImageData(
        new Uint8ClampedArray(orig.data),
        canvas.width,
        canvas.height,
      );

      // Mean-luminance threshold
      let sum = 0;
      for (let i = 0; i < bin.data.length; i += 4) {
        sum += bin.data[i] * 0.299 + bin.data[i+1] * 0.587 + bin.data[i+2] * 0.114;
      }
      const thr = sum / (bin.data.length / 4);
      for (let i = 0; i < bin.data.length; i += 4) {
        const lum = bin.data[i] * 0.299 + bin.data[i+1] * 0.587 + bin.data[i+2] * 0.114;
        const bw  = lum < thr ? 0 : 255;
        bin.data[i] = bin.data[i+1] = bin.data[i+2] = bw;
        bin.data[i+3] = 255;
      }
      const code = jsQR(bin.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) return code.data;
    } catch (_) {}
  }

  return null;
}

function isUpiId(value) {
  const t = (value || '').trim();
  return t.includes('@') && !t.startsWith('upi://');
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ScannerScreen({ onScanSuccess, onClose }) {
  const [mode, setMode]                   = useState('camera');
  const [manualInput, setManualInput]     = useState('');
  const [decodedPayeeName, setDecodedPayeeName] = useState('');
  const [error, setError]                 = useState('');
  const [uploading, setUploading]         = useState(false);
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

    try {
      const qrCodeText = await Promise.race([
        decodeQrFromFile(file),
        new Promise((_, rej) => setTimeout(() => rej(new Error('DECODE_TIMEOUT')), 20000)),
      ]);

      if (qrCodeText) {
        const upiId = extractUpiId(qrCodeText);
        if (upiId) {
          try {
            const pn = new URLSearchParams(new URL(qrCodeText).search).get('pn');
            if (pn) setDecodedPayeeName(decodeURIComponent(pn));
          } catch (_) {}
          setManualInput(upiId);
        } else {
          setError('Image decoded but no UPI QR found. Enter the UPI ID manually.');
        }
      } else {
        setError('Could not read QR code. Make sure the full QR is visible and well-lit, or enter the UPI ID manually.');
      }
    } catch (err) {
      if (err.message === 'DECODE_TIMEOUT') {
        setError('QR decode timed out. Try a clearer image or enter the UPI ID manually.');
      } else {
        console.error('[ScannerScreen] decode error:', err);
        setError('Failed to read image. Try another photo or enter the UPI ID manually.');
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

      {/* Manual / Upload Mode */}
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

              {/* UPI ID field */}
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
                    Auto-decoded from QR — verify the UPI ID is correct before continuing.
                  </p>
                )}
                {inputIsUpiId && !decodedPayeeName && !error && (
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                    UPI ID entered. Your payment app will confirm the recipient before you approve.
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
