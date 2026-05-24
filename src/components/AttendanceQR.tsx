import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { motion } from 'framer-motion';
import { QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AttendanceQR() {
  const [code, setCode] = useState('');
  const [expiresIn, setExpiresIn] = useState(60);

  const generateCode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setCode(newCode);
    setExpiresIn(60);
  };

  useEffect(() => {
    generateCode();
    const interval = setInterval(() => {
      setExpiresIn(prev => {
        if (prev <= 1) {
          generateCode();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#090615] border border-white/10 rounded-[2rem] p-6 text-center">
      <h3 className="text-white text-sm font-black uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
        <QrCode className="text-indigo-400" size={18} /> Attendance QR
      </h3>
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-white rounded-2xl">
          <QRCode value={code} size={150} />
        </div>
      </div>
      <div className="text-3xl font-black font-mono text-white mb-1">{code}</div>
      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
        Expires in {expiresIn}s
      </div>
      <button 
        onClick={generateCode}
        className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
      >
        <RefreshCw size={14} /> Refresh Code
      </button>
    </div>
  );
}
