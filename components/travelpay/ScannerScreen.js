import React, { useState, useRef } from 'react';
import { X, Keyboard, Camera, Image } from 'lucide-react';
import QRScanner from './QRScanner';

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

    try {
      let qrCodeText = null;

      // BarcodeDetector: native browser API available on iOS Safari 17+ and Android Chrome.
      // Handles EXIF rotation correctly — images from iPhone camera roll work without fix-up.
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const bitmap   = await createImageBitmap(file);
          const codes    = await detector.detect(bitmap);
          if (codes.length > 0) qrCodeText = codes[0].rawValue;
        } catch (_) { /* fall through to html5-qrcode */ }
      }

      // Fallback: html5-qrcode scanFile (works on desktop Chrome/Firefox).
      // showImage=false so it doesn't need the container div to be visible.
      if (!qrCodeText) {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('qr-reader-upload');
        qrCodeText = await scanner.scanFile(file, /* showImage */ false);
      }

      if (qrCodeText) {
        if (qrCodeText.startsWith('upi://pay')) {
          setManualInput(qrCodeText);
          setError('');
        } else if (isUpiId(qrCodeText)) {
          // QR contained a bare UPI ID — auto-submit directly
          onScanSuccess({ raw: `upi://pay?pa=${encodeURIComponent(qrCodeText)}&cu=INR` });
        } else {
          setError('Could not find a valid UPI QR code in this image');
        }
      } else {
        setError('Could not find a valid UPI QR code in this image');
      }
    } catch (err) {
      console.error('[ScannerScreen] QR decode error:', err);
      setError('Failed to decode QR code from image. Please try another image or enter the UPI ID manually.');
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

      {/* Off-screen div for html5-qrcode fallback — must NOT be display:none or canvas rendering breaks */}
      <div id="qr-reader-upload" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}></div>
    </div>
  );
}
