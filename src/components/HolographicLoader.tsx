import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Sparkles, Shield, Cpu } from 'lucide-react';

export default function HolographicLoader() {
  const [loadingStep, setLoadingStep] = useState(0);
  const steps = [
    "LOADING SECURE CHANNELS...",
    "VERIFYING DATA INTEGRITY...",
    "INITIATING HOLOGRAPHICS...",
    "SYSTEM DEPLOYMENT SUCCESS"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="min-h-screen w-full bg-[#030107] relative flex flex-col items-center justify-center overflow-hidden select-none font-sans text-white">
      {/* Laser Scanning Grids Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.15)_0%,_transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-15 bg-[linear-gradient(rgba(139,92,246,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.25)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Futuristic Concentric HUD Concentrics */}
      <div className="relative flex items-center justify-center p-8">
        {/* Laser Scanner Sweep Line */}
        <motion.div
          animate={{ y: [-150, 150, -150] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[-50px] right-[-50px] h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)] z-10 pointer-events-none"
        />

        {/* Outer dotted dashboard ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="w-56 h-56 rounded-full border-2 border-violet-500/20 border-dashed flex items-center justify-center relative"
        >
          {/* Cyan scanner tick */}
          <div className="absolute top-[-5px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee] animate-pulse" />
          
          {/* Pink scanner tick */}
          <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-pink-500 rounded-full shadow-[0_0_10px_#ec4899] animate-pulse" />
        </motion.div>

        {/* Medium cyan ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-44 h-44 rounded-full border border-cyan-400/30 absolute flex items-center justify-center p-2"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-cyan-400/80 rounded" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-cyan-400/80 rounded" />
        </motion.div>

        {/* Core spinning loader logo */}
        <div className="w-32 h-32 rounded-full bg-slate-900/80 backdrop-blur-2xl border border-violet-500/40 absolute flex flex-col items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)]">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-white/90 drop-shadow-[0_0_15px_rgba(139,92,246,0.7)] text-5xl font-black font-sans select-none"
          >
            M
          </motion.div>
          <div className="absolute bottom-4 flex items-center gap-1">
            <Loader2 className="animate-spin text-cyan-400 shrink-0" size={11} />
            <span className="text-[8px] font-mono tracking-widest text-cyan-400 animate-pulse font-black">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Glowing Status Message */}
      <div className="mt-10 text-center space-y-2 z-10">
        <h2 className="text-xs uppercase font-mono font-black tracking-[0.3em] text-violet-300 flex items-center justify-center gap-1.5">
          <Sparkles size={12} className="animate-pulse text-cyan-400" />
          INMARKET SECURE SYSTEM
        </h2>
        
        {/* Active step display */}
        <div className="h-4 flex items-center justify-center">
          <p className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950/30 px-3 py-1 rounded-full border border-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
            {steps[loadingStep]}
          </p>
        </div>
      </div>

      {/* Cyberpunk Telemetry stats at absolute bottom */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between font-mono text-[9px] text-slate-500/75 pointer-events-none">
        <div className="space-y-0.5">
          <span className="flex items-center gap-1 text-[8px] text-violet-400 font-black tracking-widest uppercase">
            <Cpu size={10} /> CORE_MODULES: ONLINE
          </span>
          <span>SYS_INITIALIZER_V2.6_ACTIVE</span>
        </div>
        <div className="text-right space-y-0.5">
          <span className="flex items-center justify-end gap-1 text-[8px] text-cyan-400 font-black tracking-widest uppercase">
            <Shield size={10} /> LEDGER: PROTECTED
          </span>
          <span>INTEGRITY_INDEX: 100%</span>
        </div>
      </div>
    </div>
  );
}
