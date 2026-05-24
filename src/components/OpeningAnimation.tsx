import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playScanSound, playSuccessSound } from '../lib/sounds';

export default function OpeningAnimation({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [startClicked, setStartClicked] = useState(false);
  const fullText = "Smart Business Assistant for Modern Business";

  // Simulate automatic user click to trigger audio context if needed
  useEffect(() => {
    // Typing animation
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setTypedText((prev) => prev + fullText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 45);

    // Auto complete after 6.5s
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 1200);
    }, 6500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  // Play audio triggers
  const handleTriggerInteraction = () => {
    setStartClicked(true);
    playSuccessSound();
    setTimeout(() => {
      playScanSound();
    }, 500);
  };

  useEffect(() => {
    // Attempt auto-sound synthesis
    const timer = setTimeout(() => {
      playScanSound();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030107] overflow-hidden select-none"
        >
          {/* Cybernetic Grid/Radial Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-950/25 via-[#030107] to-[#010003] pointer-events-none" />
          
          {/* Glitch Tech Hex lines background decoration */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(18,10,36,0.35)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(18,10,36,0.35)_1.5px,transparent_1.5px)] bg-[size:30px_30px]" />

          {/* Glowing AI floating nodes */}
          <div className="absolute top-1/4 left-1/5 w-2.5 h-2.5 bg-cyan-400 rounded-full blur-[2px] animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-1/3 right-1/4 w-3.5 h-3.5 bg-violet-400 rounded-full blur-[3px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-1/2 right-1/5 w-2 h-2 bg-pink-500 rounded-full blur-[1px] animate-bounce" style={{ animationDuration: '5s' }} />

          {/* Main Cinematic Logo Structure */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 45, damping: 15 }}
            onClick={handleTriggerInteraction}
            className="relative cursor-pointer group flex flex-col items-center py-6"
          >
            {/* Holographic light cone reflection overlay */}
            <div className="absolute -top-32 w-72 h-[350px] bg-gradient-to-b from-violet-500/10 via-cyan-400/5 to-transparent blur-2xl rounded-full skew-y-12 animate-pulse pointer-events-none" />

            {/* Glowing laser scanning ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="w-48 h-48 border-2 border-violet-500/20 border-dashed rounded-full flex items-center justify-center relative p-3 text-white"
            >
              <div className="w-40 h-40 border border-cyan-400/40 rounded-full flex items-center justify-center relative">
                {/* Internal HUD ticks */}
                <span className="absolute top-1 w-1.5 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span className="absolute bottom-1 w-1.5 h-0.5 bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                <span className="absolute left-1 w-0.5 h-1.5 bg-violet-500 shadow-[0_0_8px_#a78bfa]" />
                <span className="absolute right-1 w-0.5 h-1.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <div className="w-32 h-32 border border-violet-500/10 rounded-full bg-slate-900/40 backdrop-blur-md" />
              </div>

              {/* Rotating outer indicator dots */}
              <div className="absolute -top-1 w-2.5 h-2.5 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
              <div className="absolute -bottom-1 w-2 h-2 bg-gradient-to-r from-pink-500 to-fuchsia-400 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.8)]" />
            </motion.div>
            
            {/* Pulsing Glowing 'M' Logo in the center */}
            <div className="absolute inset-0 flex items-center justify-center mt-2">
              <motion.span
                animate={{
                  textShadow: [
                    "0 0 10px rgba(139, 92, 246, 0.6), 0 0 20px rgba(139, 92, 246, 0.4)",
                    "0 0 30px rgba(34, 211, 238, 0.8), 0 0 40px rgba(34, 211, 238, 0.5)",
                    "0 0 15px rgba(236, 72, 153, 0.6), 0 0 25px rgba(236, 72, 153, 0.4)",
                    "0 0 10px rgba(139, 92, 246, 0.6), 0 0 20px rgba(139, 92, 246, 0.4)"
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="text-8xl font-black text-white bg-clip-text select-none text-transparent bg-gradient-to-br from-white via-violet-300 to-cyan-200"
              >
                M
              </motion.span>
            </div>

            {/* AI HUD scanning ray banner overlay */}
            <motion.div 
              animate={{
                top: ["20%", "72%", "20%"]
              }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.9)] pointer-events-none"
            />
          </motion.div>
          
          {/* Main Titles */}
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.75, type: 'spring' }}
            className="text-center mt-12 z-10 px-4"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-violet-300 relative">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-200 to-cyan-300 drop-shadow-[0_0_15px_rgba(139,92,246,0.35)]">InMarket</span>
            </h1>
            
            {/* Typing AI Animation Sub Text */}
            <div className="h-6 mt-4 flex items-center justify-center">
              <p className="text-violet-300/80 text-xs md:text-sm font-mono tracking-[0.25em] uppercase font-bold">
                {typedText}
                <span className="inline-block w-1.5 h-4 ml-1 bg-cyan-400 animate-[pulse_0.8s_infinite] align-middle" />
              </p>
            </div>
          </motion.div>

          {/* Sound trigger invitation button */}
          <AnimatePresence>
            {!startClicked && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={handleTriggerInteraction}
                className="mt-10 px-5 py-2.5 bg-violet-600/15 hover:bg-violet-600/30 border border-violet-500/30 font-bold tracking-widest text-[10px] uppercase text-violet-300 rounded-full backdrop-blur-xl transition shadow-[0_0_15px_rgba(139,92,246,0.15)] flex items-center gap-1.5 animate-bounce"
              >
                🔊 TEST HOLOGRAPHIC CHIME
              </motion.button>
            )}
          </AnimatePresence>

          {/* Ambient system load message in bottom corner */}
          <div className="absolute bottom-6 left-8 font-mono text-[9px] text-slate-500 opacity-60 pointer-events-none hidden md:block">
            SYSTEM_INTEGRITY: NORMAL<br />
            LEDGER_NETWORK: SECURE_NET_2026<br />
            NODE_STATE: INITIATING_HOLOGRAPHICS
          </div>

          <div className="absolute bottom-6 right-8 font-mono text-[9px] text-slate-500 opacity-60 text-right pointer-events-none hidden md:block">
            HOST: CLOUD_RUN_CONTAINER<br />
            PROTOCOL: TLS_EDGE_ROUTE<br />
            INSTANCE: VITE-SPA-REACT
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
