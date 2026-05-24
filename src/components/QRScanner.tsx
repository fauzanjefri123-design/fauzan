import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, AlertCircle, Check, X, ShieldAlert, Laptop, Eye, HelpCircle } from 'lucide-react';
import { playScanSound, playClickSound } from '../lib/sounds';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  placeholderText?: string;
  isQuickMode?: boolean;
}

export default function QRScanner({ onScanSuccess, placeholderText, isQuickMode = false }: QRScannerProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = useRef(`qr-reader-elem-${Math.floor(Math.random() * 100000)}`);
  const scanAttemptsRef = useRef(0);

  // Initialize camera list
  useEffect(() => {
    let active = true;

    const initCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!active) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          setPermissionState('granted');
          // Prefer back camera if available
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setPermissionState('prompt');
        }
      } catch (err: any) {
        console.warn("Camera enumeration failed:", err);
        if (err?.toString().includes("NotAllowedError") || err?.name === "NotAllowedError") {
          setPermissionState('denied');
        } else {
          setPermissionState('prompt');
        }
      }
    };

    initCameras();

    return () => {
      active = false;
      // Force shutdown scanning on unmount
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
              html5QrCodeRef.current.stop().then(() => {
                  html5QrCodeRef.current?.clear();
              }).catch(e => console.warn("Unmount cleanup stop error:", e));
          } else {
              html5QrCodeRef.current.clear();
          }
        } catch(e) {
          console.warn("Unmount cleanup error:", e);
        }
      }
    };
  }, []);

  const requestPermissionAndStart = async () => {
    playClickSound();
    setError('');
    try {
      // Create element instance if not created
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId.current);
      }

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        setPermissionState('granted');
        const backCam = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') || 
          d.label.toLowerCase().includes('environment')
        );
        const camToUse = backCam ? backCam.id : devices[0].id;
        setSelectedCameraId(camToUse);
        await startCameraStream(camToUse);
      } else {
        // Direct start facingMode environment as default fallback
        await startCameraStreamWithFacingMode();
      }
    } catch (err: any) {
      console.error("Camera activation error:", err);
      // Give fallback guidance
      if (err?.name === "NotAllowedError" || err?.toString().includes("NotAllowedError")) {
        setPermissionState('denied');
        setError("Izin kamera ditolak. Harap izinkan akses kamera di peramban Anda.");
      } else {
        setError(err?.message || "Tidak dapat mengaktifkan kamera. Periksa perangkat keras atau ganti ke mode Emulator.");
      }
    }
  };

  const startCameraStream = async (cameraId: string) => {
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(scannerContainerId.current);
    }

    if (html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
    }

    await html5QrCodeRef.current.start(
      cameraId,
      {
        fps: 15,
        qrbox: (w, h) => {
          const size = Math.min(w, h) * 0.7;
          return { width: Math.max(160, Math.floor(size)), height: Math.max(160, Math.floor(size)) };
        },
        aspectRatio: 1.333333,
      },
      (decodedText) => {
        // Debounce scan results to prevent multiple scans in 1 second
        const now = Date.now();
        if (now - scanAttemptsRef.current < 1200) return;
        scanAttemptsRef.current = now;

        playScanSound();
        onScanSuccess(decodedText.trim());
      },
      () => {
        // Verbose seeking errors, can be ignored
      }
    );

    setIsScanning(true);
    setError('');
  };

  const startCameraStreamWithFacingMode = async () => {
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(scannerContainerId.current);
    }

    if (html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
    }

    await html5QrCodeRef.current.start(
      { facingMode: "environment" },
      {
        fps: 15,
        qrbox: (w, h) => {
          const size = Math.min(w, h) * 0.7;
          return { width: Math.max(160, Math.floor(size)), height: Math.max(160, Math.floor(size)) };
        },
        aspectRatio: 1.333333,
      },
      (decodedText) => {
        const now = Date.now();
        if (now - scanAttemptsRef.current < 1200) return;
        scanAttemptsRef.current = now;

        playScanSound();
        onScanSuccess(decodedText.trim());
      },
      () => {}
    );

    setIsScanning(true);
    setError('');
  };

  const stopCameraStream = async () => {
    playClickSound();
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn("Stop stream error:", err);
      }
    }
    setIsScanning(false);
  };

  const switchCamera = async (cameraId: string) => {
    playClickSound();
    setSelectedCameraId(cameraId);
    if (isScanning) {
      try {
        await startCameraStream(cameraId);
      } catch (err: any) {
        setError("Gagal mengganti kamera: " + (err?.message || err));
      }
    }
  };

  // Submit mock text for testing if no camera device or in virtual sandboxes
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    playScanSound();
    onScanSuccess(manualInput.trim());
    setManualInput('');
  };

  return (
    <div className="space-y-4">
      {/* Holographic Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#110b33]/40 border border-violet-500/20 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 p-2 rounded-xl text-cyan-400">
            <Camera className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h5 className="text-xs font-black uppercase tracking-widest font-mono text-cyan-400">
              Web-Based Camera Live Scanner
            </h5>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              AKSES SENSOR KAMERA PERANGKAT SECARA NYATA UNTUK INPUT SCANNER
            </p>
          </div>
        </div>

        {/* Action button triggers camera */}
        <div className="flex flex-wrap items-center gap-2">
          {!isScanning ? (
            <button
              onClick={requestPermissionAndStart}
              className="py-1.5 px-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-black text-[10px] font-mono tracking-wider uppercase rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition duration-200 cursor-pointer"
            >
              Hubungkan Kamera
            </button>
          ) : (
            <button
              onClick={stopCameraStream}
              className="py-1.5 px-3 bg-rose-500/20 border border-rose-500/40 text-rose-400 font-black text-[10px] font-mono tracking-wider uppercase rounded-xl hover:bg-rose-500/30 transition duration-200 cursor-pointer"
            >
              Matikan Kamera
            </button>
          )}

          <button
            onClick={() => { playClickSound(); setShowHelp(!showHelp); }}
            className="p-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white transition duration-150"
            title="Daftar Kode QR Demo"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </div>

      {/* Info helper list */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-[#110c28]/90 border border-indigo-400/20 rounded-xl text-[10px] font-mono text-slate-300 space-y-1.5 leading-relaxed"
          >
            <div className="text-cyan-400 font-bold uppercase tracking-wider">💡 Kode QR / Barcode yang Dapat Di-scan:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <div>• Barcode Produk (Cth: <code className="text-indigo-400 font-bold">8993213002</code> / <code className="text-indigo-400 font-bold">8993213054</code>)</div>
              <div>• ID Member Pelanggan (Cth: <code className="text-violet-400 font-bold">c1</code> / <code className="text-violet-400 font-bold">c2</code> / <code className="text-violet-400 font-bold">c3</code>)</div>
              <div>• Handphone Pelanggan (Cth: <code className="text-violet-400 font-bold">081234567890</code> / <code className="text-violet-400 font-bold">085799887766</code>)</div>
              <div>• Email Pelanggan (Cth: <code className="text-violet-400 font-bold">ahmadf@gmail.com</code> / <code className="text-violet-400 font-bold">siti.rahma@yahoo.com</code>)</div>
            </div>
            <p className="opacity-60 text-[9px] mt-1 italic border-t border-slate-800 pt-1">
              Tips: Sangat cocok dicoba menggunakan ponsel Anda dengan mengarahkan kamera ke kode QR / Barcode.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Cam screen */}
        <div className="lg:col-span-8 relative aspect-video bg-black/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center group">
          
          <div id={scannerContainerId.current} className="absolute inset-0 w-full h-full object-cover z-0" />

          {/* Active grid scanner lines */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Pulsing red laser */}
              <motion.div
                animate={{ y: ["0%", "100%", "0%"] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                className="absolute left-0 w-full h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]"
              />
              {/* Safe area target frame */}
              <div className="absolute inset-10 sm:inset-14 border border-dashed border-cyan-400/40 rounded-xl flex items-center justify-center">
                <div className="border-t-4 border-l-4 border-cyan-400 w-6 h-6 absolute top-0 left-0 rounded-tl" />
                <div className="border-t-4 border-r-4 border-cyan-400 w-6 h-6 absolute top-0 right-0 rounded-tr" />
                <div className="border-b-4 border-l-4 border-cyan-400 w-6 h-6 absolute bottom-0 left-0 rounded-bl" />
                <div className="border-b-4 border-r-4 border-cyan-400 w-6 h-6 absolute bottom-0 right-0 rounded-br" />
                
                <div className="text-[8px] sm:text-[9px] font-mono tracking-widest text-cyan-400/70 bg-black/50 px-2 py-0.5 rounded uppercase font-semibold">
                  SINKRONISASI AI_SCAN_MODE
                </div>
              </div>
            </div>
          )}

          {/* State Screens when not scanning */}
          {!isScanning && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-center px-6">
              {permissionState === 'denied' ? (
                <>
                  <ShieldAlert className="w-12 h-12 text-rose-400 mb-3 animate-bounce" />
                  <h6 className="text-xs font-black uppercase text-rose-400 font-mono">Akses Kamera Ditolak</h6>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">
                    Browser Anda melarang akses ke kamera. Silakan aktifkan izin kamera atau gunakan Simulator Kode di sebelah kanan untuk melanjutkan pengujian.
                  </p>
                </>
              ) : (
                <>
                  <Laptop className="w-10 h-10 text-cyan-400/60 mb-3" />
                  <h6 className="text-[11px] font-black uppercase text-slate-300 font-mono tracking-wider">Kamera Siap Dihubungkan</h6>
                  <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Ujilah dengan mengaktifkan kamera Anda, atau gunakan Simulator input untuk pengujian cepat!
                  </p>
                  <button
                    onClick={requestPermissionAndStart}
                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera size={14} /> Aktifkan Kamera Hidup
                  </button>
                </>
              )}
            </div>
          )}

          {/* Selector overlay for back / front cams */}
          {isScanning && cameras.length > 1 && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/5 backdrop-blur">
              <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
              <select
                value={selectedCameraId}
                onChange={(e) => switchCamera(e.target.value)}
                className="bg-transparent text-[9px] font-mono font-bold text-slate-200 outline-none pr-4 border-none cursor-pointer"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id} className="bg-slate-900 text-white">
                    {cam.label || `Kamera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Current Camera Indicator */}
          {isScanning && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[8px] font-mono text-cyan-400 tracking-wider">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
              LIVE_FEED
            </div>
          )}
        </div>

        {/* Input simulator fallback for convenient development/testing */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-[#0e0a29]/60 border border-violet-500/10 p-4 rounded-2xl">
          <div className="space-y-3">
            <div>
              <h6 className="text-[10px] font-black tracking-widest text-violet-400 font-mono uppercase flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5" />
                VIRTUAL EMULATOR BARCODE/QR
              </h6>
              <p className="text-[9px] text-slate-400 font-mono leading-normal mt-1">
                Jika Anda tidak memiliki kamera fisik atau kamera buram, ketikkan email/sandi barcode di bawah untuk mensimulasikan hasil pemindaian.
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-2">
              <input
                type="text"
                placeholder={placeholderText || "Ketik Barcode atau Email Member..."}
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-xs font-mono font-black text-cyan-400 placeholder:text-slate-600 outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-[10px] font-mono tracking-wider uppercase rounded-xl cursor-pointer flex items-center justify-center gap-1"
              >
                Simulasikan Deteksi <ArrowUpRight className="w-3 h-3" />
              </button>
            </form>
          </div>

          <div className="border-t border-slate-800/60 pt-3 mt-4">
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 text-[8px] font-mono leading-normal text-slate-400 space-y-1">
              <span className="text-indigo-400 font-semibold block">INTEGRASI REAL-TIME:</span>
              <p>• Produk: Mencocokkan barcode otomatis, menambah kuantitas item atau mendaftarkan stok unit.</p>
              <p>• CRM: Mencari database member via handphone atau email.</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-[11px] font-medium leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  );
}

// Arrow icon helper
function ArrowUpRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}
