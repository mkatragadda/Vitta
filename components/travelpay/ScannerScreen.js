import React, { useState, useRef } from 'react';
import { X, Keyboard, Camera, Image } from 'lucide-react';
import QRScanner from './QRScanner';

// ── QR decode helpers ──────────────────────────────────────────────────────

// ZXing decoder via html5-qrcode. Creates a throwaway off-screen div each
// call so multiple decode attempts never hit the "already initialised" error.
async function decodeWithZxing(file) {
  const { Html5Qrcode } = await import('html5-qrcode');
  const divId = `qr-decode-${Date.now()}`;
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

// Load a File into an <img> element (applies EXIF orientation on iOS/Chrome)
// then draw to a ≤1024px canvas and return the re-encoded File.
// Rejects after 10 s to prevent infinite hangs on mobile.
function exifCorrectAndScale(file) {
  return new Promise((resolve, reject) => {
    const MAX  = 1024;
    const bail = setTimeout(() => reject(new Error('exif-timeout')), 10000);

    const reader = new FileReader();
    reader.onerror = () => { clearTimeout(bail); reject(new Error('FileReader error')); };
    reader.onload  = (ev) => {
      const img = new Image();
      img.onerror = () => { clearTimeout(bail); reject(new Error('Image load error')); };
      img.onload  = () => {
        const scale  = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        const w      = Math.round(img.naturalWidth  * scale);
        const h      = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          clearTimeout(bail);
          if (blob) resolve(new File([blob], 'qr.jpg', { type: 'image/jpeg' }));
          else      reject(new Error('toBlob failed'));
        }, 'image/jpeg', 0.92);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Detect whether a string is a bare UPI ID (e.g. "merchant@okicici")
// vs a full UPI URL (e.g. "upi://pay?pa=...")
function isUpiId(value) {
  const trimmed = value.trim();
  return trimmed.includes('@') && !trimmed.startsWith('upi://');
}

export default function ScannerScreen({ onScanSuccess, onClose }) {
  const [mode, setMode] = useState('camera');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const inputIsUpiId = isUpiId(manualInput);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = manualInput.trim();
    if (!trimmed) {
      setError('Please enter a UPI ID or UPI URL');
      return;
    }

    if (inputIsUpiId) {
      // Bare UPI ID — build a minimal UPI URL so the rest of the flow works
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

    // All decode attempts wrapped in a 20s race — prevents infinite spinner if
    // FileReader / BarcodeDetector / canvas silently hangs on some mobile browsers.
    const decode = async () => {
      let qrCodeText = null;

      // ── Strategy 1: BarcodeDetector (iOS 17+, Android Chrome) ────────────
      // Native OS decoder, best accuracy, handles EXIF automatically.
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const bitmap   = await createImageBitmap(file);
          const codes    = await detector.detect(bitmap);
          if (codes.length > 0) qrCodeText = codes[0].rawValue;
        } catch (_) {}
      }

      // ── Strategy 2: EXIF-corrected image → ZXing (html5-qrcode) ─────────
      // ZXing has stronger error correction than jsqr — handles QRs with logo
      // overlays (PhonePe, GPay) that cover center modules.
      // We run on an EXIF-corrected/scaled canvas blob so mobile photos arrive
      // with correct orientation and don't OOM on large sensor images.
      if (!qrCodeText) {
        try {
          const corrected = await exifCorrectAndScale(file);
          qrCodeText = await decodeWithZxing(corrected);
        } catch (_) {}
      }

      // ── Strategy 3: ZXing on the original file (desktop / quick path) ────
      // Fallback if EXIF correction itself failed (e.g. unsupported file type).
      if (!qrCodeText) {
        try {
          qrCodeText = await decodeWithZxing(file);
        } catch (_) {}
      }

      // ── Strategy 4: jsqr on EXIF-corrected canvas ────────────────────────
      // Last resort — lighter library, sometimes succeeds when ZXing throws.
      if (!qrCodeText) {
        try {
          const jsQR   = (await import('jsqr')).default;
          const imgEl  = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onerror = rej;
            reader.onload  = (ev) => {
              const img = new Image();
              img.onerror = rej;
              img.onload  = () => res(img);
              img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
          });
          const MAX   = 1024;
          const scale = Math.min(1, MAX / Math.max(imgEl.naturalWidth, imgEl.naturalHeight));
          const w     = Math.round(imgEl.naturalWidth  * scale);
          const h     = Math.round(imgEl.naturalHeight * scale);
          const canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(imgEl, 0, 0, w, h);
          const imageData = canvas.getContext('2d').getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
          if (code?.data) qrCodeText = code.data;
        } catch (_) {}
      }

      return qrCodeText;
    };

    try {
      const qrCodeText = await Promise.race([
        decode(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('DECODE_TIMEOUT')), 20000)),
      ]);

      if (qrCodeText) {
        if (qrCodeText.startsWith('upi://pay')) {
          setManualInput(qrCodeText);
        } else if (isUpiId(qrCodeText)) {
          onScanSuccess({ raw: `upi://pay?pa=${encodeURIComponent(qrCodeText)}&cu=INR` });
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
              {/* Corner Borders */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-teal-500 rounded-tl-3xl"></div>
              <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-teal-500 rounded-tr-3xl"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-teal-500 rounded-bl-3xl"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-teal-500 rounded-br-3xl"></div>

              {/* Scanning Line Animation */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="scan-line w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent shadow-lg shadow-teal-500/50"></div>
              </div>

              {/* Actual QR Scanner Component */}
              <div className="absolute inset-0">
                <QRScanner onScanSuccess={onScanSuccess} />
              </div>
            </div>
          </div>

          {/* Bottom Instructions */}
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

      {/* Manual Input Mode */}
      {mode === 'manual' && (
        <div className="flex-1 flex items-center justify-center px-6 mt-32">
          <div className="w-full max-w-md">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Input Field */}
              <div>
                <label className="text-white text-sm font-semibold mb-2 block">
                  Enter UPI ID or UPI URL
                </label>
                <textarea
                  value={manualInput}
                  onChange={(e) => { setManualInput(e.target.value); setError(''); }}
                  placeholder={'name@bank  or  upi://pay?pa=name@bank&am=500&cu=INR'}
                  className="w-full bg-white/10 backdrop-blur border border-teal-500/30 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono text-sm"
                  rows={3}
                />
                {error && (
                  <p className="text-red-400 text-xs mt-2">{error}</p>
                )}
                {/* UPI ID disclaimer — shown only when user typed a bare UPI ID */}
                {inputIsUpiId && !error && (
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                    UPI ID entered. Identity is not verified here — your payment app will confirm the recipient before you approve.
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
                      <span>Decoding QR Code...</span>
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
