import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
        className="fixed inset-0 bg-[#050208] z-50 flex flex-col items-center justify-center text-white"
        exit={{ opacity: 0 }}
    >
        <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-gradient-to-tr from-violet-600 to-indigo-400 rounded-2xl flex items-center justify-center font-bold text-4xl shadow-[0_0_50px_rgba(168,85,247,0.5)] mb-8"
        >
            M
        </motion.div>
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
        >
            <h1 className="text-3xl font-bold mb-2">Welcome to InMarket</h1>
            <p className="text-white/60">Smart Business Assistant for Modern UMKM</p>
        </motion.div>
    </motion.div>
  );
}
