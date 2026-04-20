import React, { useState, useRef } from 'react';
import { X, Keyboard, Camera, Upload, Image } from 'lucide-react';
import QRScanner from './QRScanner';

export default function ScannerScreen({ onScanSuccess, onClose }) {
  const [mode, setMode] = useState('manual'); // Default to manual for desktop testing
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!manualInput.trim()) {
      setError('Please enter a UPI URL');
      return;
    }

    // Validate UPI format
    if (!manualInput.startsWith('upi://pay')) {
      setError('Invalid UPI format. Should start with "upi://pay"');
      return;
    }

    // Simulate QR scan success with manual input
    onScanSuccess({ raw: manualInput });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      // Use html5-qrcode library to decode QR from image
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader-upload');

      const qrCodeText = await html5QrCode.scanFile(file, true);

      if (qrCodeText && qrCodeText.startsWith('upi://pay')) {
        // Auto-fill the manual input with decoded URL
        setManualInput(qrCodeText);
        setError('');
      } else {
        setError('Could not find valid UPI QR code in image');
      }
    } catch (err) {
      console.error('[ScannerScreen] QR decode error:', err);
      setError('Failed to decode QR code from image. Please try another image or enter URL manually.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sampleUPI = 'upi://pay?pa=merchant@paytm&pn=Sample Merchant&am=450&cu=INR';
  const sampleUPINoAmount = 'upi://pay?pa=testmerchant@paytm&pn=Test Shop&cu=INR';

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
                <QRScanner onScanSuccess={onScanSuccess} onClose={onClose} />
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
              {/* Manual Input Field */}
              <div>
                <label className="text-white text-sm font-semibold mb-2 block">
                  Enter UPI URL
                </label>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="upi://pay?pa=merchant@paytm&pn=Merchant&am=450&cu=INR"
                  className="w-full bg-white/10 backdrop-blur border border-teal-500/30 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono text-sm"
                  rows={4}
                />
                {error && (
                  <p className="text-red-400 text-xs mt-2">{error}</p>
                )}
              </div>

              {/* Upload QR Image Button */}
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

              {/* Sample UPI Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManualInput(sampleUPI)}
                  className="py-3 rounded-xl bg-white/10 backdrop-blur border border-teal-500/30 text-teal-300 text-sm font-semibold hover:bg-white/20 transition-all"
                >
                  Sample (₹450)
                </button>
                <button
                  type="button"
                  onClick={() => setManualInput(sampleUPINoAmount)}
                  className="py-3 rounded-xl bg-white/10 backdrop-blur border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-white/20 transition-all"
                >
                  Sample (No Amount)
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-white font-bold shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50 transition-all"
              >
                Continue
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 glass-teal rounded-2xl p-4 border border-teal-500/30">
              <p className="text-slate-300 text-xs leading-relaxed">
                <span className="font-semibold text-white">Desktop Testing:</span> Upload a QR code screenshot, paste UPI URL, or use the sample. On mobile, use camera mode to scan real QR codes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden div for QR code decoding */}
      <div id="qr-reader-upload" className="hidden"></div>
    </div>
  );
}
