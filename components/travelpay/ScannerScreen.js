import React, { useState } from 'react';
import { X } from 'lucide-react';
import QRScanner from './QRScanner';

export default function ScannerScreen({ onScanSuccess, onClose }) {
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

      {/* Scanner Frame with Corners */}
      <div className="flex-1 flex items-center justify-center">
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
            <QRScanner
              onScanSuccess={onScanSuccess}
              onClose={onClose}
            />
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
    </div>
  );
}
