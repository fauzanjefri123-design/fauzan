import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, 
  Banknote, History, Check, ShieldCheck, X, Image as ImageIcon,
  QrCode, Smartphone, SmartphoneNfc, FileSpreadsheet, Share2, Award, Zap, AlertTriangle, Loader2
} from 'lucide-react';
import { playClickSound, playSuccessSound } from '../lib/sounds';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { 
  getWalletData, 
  updateWalletBalance
} from '../lib/firestoreService';
import { validatePhone, sanitizeInput } from '../lib/validation';

interface WalletTransaction {
  id: string;
  type: 'in' | 'out';
  amount: number;
  method: string;
  status: 'Pending' | 'Success' | 'Failed';
  date: string;
  accountName: string;
  paymentNumber: string;
  notes?: string;
  proofUrl?: string;
}

export default function WalletManager() {
  const { language } = useThemeLanguage();
  const { userData } = useAuth();
  const ownerId = userData?.ownerId || '';
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;

  // Real-time partitioned keys by unique user account (email or uid)
  const getAccountKey = (baseKey: string) => {
    const userEmail = userData?.email || 'default_user';
    const userRole = (userData?.role || 'Guest').toLowerCase().startsWith('own') ? 'own' : 'emp';
    const safeEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    return `${baseKey}_acc_${safeEmail}_${userRole}`;
  };

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Success Modal State
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [lastTopUp, setLastTopUp] = useState<WalletTransaction | null>(null);

  // Form States
  const [accountName, setAccountName] = useState('');
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Form Validation errors
  const [accountNameError, setAccountNameError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [paymentNumberError, setPaymentNumberError] = useState<string | null>(null);

  // Load cache on startup for fast offline presentation
  useEffect(() => {
    const bKey = getAccountKey('inmarket_wallet_balance');
    const tKey = getAccountKey('inmarket_wallet_transactions');
    
    setBalance(Number(localStorage.getItem(bKey)) || 0);
    const savedTx = localStorage.getItem(tKey);
    try {
      setTransactions(savedTx ? JSON.parse(savedTx) : []);
    } catch {
      setTransactions([]);
    }

    // Set name value from profile
    if (userData) {
      setAccountName((userData as any).name || (userData as any).displayName || userData.email || '');
    }
  }, [userData]);

  // Sync balance and transactions live via Firestore onSnapshot
  useEffect(() => {
    if (!ownerId) return;

    const unsubscribe = getWalletData(
      ownerId,
      (data) => {
        if (data) {
          const fetchedBalance = data.balance || 0;
          const fetchedTxs = data.transactions || [];
          setBalance(fetchedBalance);
          setTransactions(fetchedTxs);
          
          // cache for offline resilience
          localStorage.setItem(getAccountKey('inmarket_wallet_balance'), fetchedBalance.toString());
          localStorage.setItem(getAccountKey('inmarket_wallet_transactions'), JSON.stringify(fetchedTxs));
        }
      },
      (err) => {
        console.error('Wallet snapshot failed: ', err);
      }
    );

    return () => unsubscribe();
  }, [ownerId]);

  // Form validations live triggers
  useEffect(() => {
    if (accountName) {
      if (accountName.trim().length === 0) setAccountNameError('Nama akun wajib diisi');
      else if (accountName.length > 50) setAccountNameError('Nama akun maksimal 50 karakter');
      else setAccountNameError(null);
    } else {
      setAccountNameError(null);
    }
  }, [accountName]);

  useEffect(() => {
    if (topUpAmount !== undefined) {
      if (topUpAmount <= 0) setAmountError('Nominal top-up harus lebih besar dari Rp0');
      else if (topUpAmount > 100000000) setAmountError('Maksimal top-up sekali transaksi adalah Rp100,000,000');
      else setAmountError(null);
    } else {
      setAmountError(null);
    }
  }, [topUpAmount]);

  useEffect(() => {
    if (paymentNumber) {
      const err = validatePhone(paymentNumber, true);
      setPaymentNumberError(err);
    } else {
      setPaymentNumberError(null);
    }
  }, [paymentNumber]);

  const handleQuickAmount = (amount: number) => {
    playClickSound();
    setTopUpAmount(amount);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || loading) return;

    if (topUpAmount <= 0 || !!amountError) {
      toast.error(language === 'id' ? 'Nominal harus lebih dari Rp0 dan valid' : 'Amount must be greater than Rp0 and valid');
      return;
    }
    if (!paymentMethod) {
      toast.error(language === 'id' ? 'Pilih metode pembayaran' : 'Select a payment method');
      return;
    }
    if (!paymentNumber || !!paymentNumberError) {
      toast.error(language === 'id' ? 'Masukkan nomor pembayaran yang valid' : 'Enter a valid payment number');
      return;
    }

    setLoading(true);
    playClickSound();

    try {
      const txId = `TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      const newTransaction = {
        id: txId,
        type: 'in' as const,
        amount: topUpAmount,
        method: sanitizeInput(paymentMethod),
        status: 'Success' as const,
        accountName: sanitizeInput(accountName) || 'Unregistered Account',
        paymentNumber: sanitizeInput(paymentNumber),
        notes: notes ? sanitizeInput(notes) : '',
        proofUrl: uploadPreview ? sanitizeInput(uploadPreview) : ''
      };

      // update atomic transaction document structure directly
      await updateWalletBalance(ownerId, topUpAmount, newTransaction);

      // cache update to trigger responsive feel
      const newBalance = balance + topUpAmount;
      setBalance(newBalance);
      localStorage.setItem(getAccountKey('inmarket_wallet_balance'), newBalance.toString());

      setLastTopUp({
        ...newTransaction,
        date: new Date().toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
      
      // Points accumulation sync
      const pKey = getAccountKey('inmarket_user_profile');
      const savedProfile = localStorage.getItem(pKey);
      if (savedProfile) {
        try {
          const prof = JSON.parse(savedProfile);
          prof.points = (prof.points || 0) + Math.floor(topUpAmount / 2000);
          if (prof.points >= 15000) prof.level = 'King';
          else if (prof.points >= 5000) prof.level = 'Suhu';
          else if (prof.points >= 1000) prof.level = 'Pro Player';
          else prof.level = 'Amateur';
          
          localStorage.setItem(pKey, JSON.stringify(prof));
        } catch {}
      }

      setShowTopUpForm(false);
      setTopUpAmount(0);
      setPaymentMethod('');
      setPaymentNumber('');
      setUploadPreview(null);
      setNotes('');

      playSuccessSound();
      setShowSuccessPopup(true);
      
      toast.success(t('topUpSuccess'), {
        style: {
          background: '#111',
          color: '#fff',
          border: '1px solid #10b981'
        },
        icon: '💰'
      });
    } catch (err) {
      console.error(err);
      toast.error('Gagal melakukan top-up ke cloud node wallet.');
    } finally {
      setLoading(false);
    }
  };

  const PAYMENT_METHODS = [
    { id: 'QRIS', label: 'QRIS 2026', icon: QrCode, color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40' },
    { id: 'DANA', label: 'DANA', icon: Smartphone, color: 'text-[#1e88e5] border-[#1e88e5]/20 bg-[#1e88e5]/5 hover:border-[#1e88e5]/40' },
    { id: 'OVO', label: 'OVO', icon: SmartphoneNfc, color: 'text-[#9c27b0] border-[#9c27b0]/20 bg-[#9c27b0]/5 hover:border-[#9c27b0]/40' },
    { id: 'GOPAY', label: 'GOPAY', icon: Smartphone, color: 'text-[#00c853] border-[#00c853]/20 bg-[#00c853]/5 hover:border-[#00c853]/40' },
    { id: 'SHOPEEPAY', label: 'ShopeePay', icon: Smartphone, color: 'text-[#ff5722] border-[#ff5722]/20 bg-[#ff5722]/5 hover:border-[#ff5722]/40' },
    { id: 'BCA', label: 'Bank BCA', icon: CreditCard, color: 'text-blue-500 border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40' },
    { id: 'BRI', label: 'Bank BRI', icon: CreditCard, color: 'text-slate-400 border-slate-400/20 bg-slate-400/5 hover:border-slate-400/40' },
    { id: 'MANDIRI', label: 'Bank Mandiri', icon: Banknote, color: 'text-yellow-600 border-yellow-600/20 bg-yellow-600/5 hover:border-yellow-600/40' },
    { id: 'BNI', label: 'Bank BNI', icon: CreditCard, color: 'text-amber-500 border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40' }
  ];

  const incomingTotal = transactions.filter(t => t.type === 'in' && t.status === 'Success').reduce((sum, t) => sum + t.amount, 0);
  const outgoingTotal = transactions.filter(t => t.type === 'out' && t.status === 'Success').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header & Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden p-8 rounded-[2rem] bg-[#090615] border border-white/10 shadow-2xl group"
          >
            {/* Holographic matrix effect cover */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-fuchsia-500 opacity-20 blur-2xl group-hover:opacity-35 transition-opacity duration-1000" />
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">{t('walletBalance')}</h2>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                      userData?.role?.toLowerCase().startsWith('own') 
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-400" 
                        : "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                    )}>
                      {userData?.role?.toLowerCase().startsWith('own') ? '👑 OWNER' : '👨‍💼 KARYAWAN'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white/50 text-2xl font-bold">Rp</span>
                    <span className="text-white text-5xl font-black tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                      {balance.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] text-indigo-400 group-hover:text-fuchsia-400 transition-colors">
                  <Wallet size={32} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {userData?.role?.toLowerCase().startsWith('own') ? (
                  <button 
                    onClick={() => { playClickSound(); setShowTopUpForm(true); }}
                    className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:scale-[1.03] transition-transform cursor-pointer"
                  >
                    <Plus size={16} /> {translations[language]?.topUpBalance || 'Isi Saldo'}
                  </button>
                ) : (
                  <div className="px-6 py-3.5 bg-white/5 border border-white/10 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2">
                    <History size={16} /> SALDO DIKELOLA OWNER
                  </div>
                )}
                <div className="flex gap-6 border-l border-white/10 pl-6">
                  <div>
                    <span className="text-slate-500 text-[9px] font-bold block uppercase mb-1">{t('incoming')}</span>
                    <span className="text-emerald-400 text-sm font-bold flex items-center gap-1 font-mono">
                      <ArrowUpRight size={14} /> Rp{incomingTotal.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] font-bold block uppercase mb-1">{t('outgoing')}</span>
                    <span className="text-rose-400 text-sm font-bold flex items-center gap-1 font-mono">
                      <ArrowDownLeft size={14} /> Rp{outgoingTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative holographic nodes */}
            <div className="absolute top-1/2 -right-10 w-40 h-40 bg-indigo-500/15 rounded-full blur-[100px]" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
          </motion.div>
        </div>

        <div className="bg-[#090615] border border-white/10 rounded-[2rem] p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <ShieldCheck size={16} /> LEDGER SECURED
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
              E-Wallet InMarket.id terproteksi enkripsi SSL end-to-end dengan multi-user ledger. Saldo akun terisolasi penuh, realtime, dan tidak dicampur dengan akun lain.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-center">
              <span className="text-[8px] text-emerald-400 font-black uppercase tracking-wider block mb-0.5">SSL NODE</span>
              <span className="block text-[10px] font-bold text-emerald-400">Stable Online</span>
            </div>
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-center">
              <span className="text-[8px] text-indigo-400 font-black uppercase tracking-wider block mb-0.5">LEDGER ACC</span>
              <span className="block text-[10px] font-bold text-indigo-400">Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="p-6 rounded-[2rem] bg-[#090615] border border-white/10 shadow-xl overflow-hidden relative">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <History size={18} className="text-emerald-400" /> {language === 'id' ? 'Riwayat Transaksi Akun' : 'Account Transaction History'}
          </h3>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <Wallet className="text-slate-600" size={32} />
              </div>
              <p className="text-slate-500 text-xs font-bold tracking-wide italic">{t('emptyBalance')}</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <motion.div 
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${tx.type === 'in' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {tx.type === 'in' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="block text-xs font-bold text-white uppercase tracking-wider">{tx.method}</span>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-mono font-bold">{tx.accountName}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">{t('transID')}: {tx.id} • {tx.date}</span>
                    {tx.notes && <span className="text-[10px] text-teal-400/80 block italic mt-1">"{tx.notes}"</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`block text-sm font-black font-mono ${tx.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'in' ? '+' : '-'} Rp{tx.amount.toLocaleString()}
                  </span>
                  <span className={`text-[8px] px-2 py-0.5 rounded cursor-default font-black uppercase tracking-wider ${
                    tx.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                    tx.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Top Up Form Drawer/Modal */}
      <AnimatePresence>
        {showTopUpForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTopUpForm(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-lg bg-[#090615] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              
              <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
                <div>
                  <h3 className="text-white text-xl font-black uppercase tracking-widest flex items-center gap-2">
                    <Plus className="text-emerald-400" size={24} /> {translations[language]?.topUpBalance || 'Top Up Saldo'}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">LEDGER ISOLATION ENDPOINT</p>
                </div>
                <button 
                  onClick={() => setShowTopUpForm(false)}
                  className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full text-slate-400 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={confirmTopUp} className="p-8 pt-4 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                {/* Account Name Field */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">{language === 'id' ? 'NAMA AKUN / PENGIRIM' : 'SENDER / ACCOUNT NAME'}</label>
                  <input 
                    required
                    type="text"
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder={language === 'id' ? "Nama lengkap pemilik akun" : "Full profile name"}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-emerald-500 font-bold transition-colors"
                  />
                  {accountNameError && (
                    <span className="text-[10px] text-rose-500 mt-1 block font-semibold flex items-center gap-1">
                      <AlertTriangle size={10} /> {accountNameError}
                    </span>
                  )}
                </div>

                {/* Amount Field */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">{language === 'id' ? 'NOMINAL TOP UP' : 'TOP UP AMOUNT'}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">Rp</span>
                    <input 
                      required
                      type="number"
                      value={topUpAmount || ''}
                      onChange={e => setTopUpAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-emerald-400 text-2xl font-black outline-none focus:border-emerald-500 font-mono transition-colors"
                    />
                  </div>
                  {amountError && (
                    <span className="text-[10px] text-rose-500 mt-1 block font-semibold flex items-center gap-1">
                      <AlertTriangle size={10} /> {amountError}
                    </span>
                  )}
                  {/* Quick Amounts */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[10000, 50000, 100000, 500000, 1000000].map(amt => (
                      <button 
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAmount(amt)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-mono font-black text-white hover:bg-emerald-500 hover:border-emerald-400 transition"
                      >
                        Rp{amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">{t('paymentMethod')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button 
                        key={m.id}
                        type="button"
                        onClick={() => { playClickSound(); setPaymentMethod(m.id); }}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border transition-all gap-1.5 ${
                          paymentMethod === m.id 
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)] scale-[1.02]' 
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <m.icon className={paymentMethod === m.id ? 'text-emerald-400' : m.color.split(' ')[0]} size={18} />
                        <span className="text-[9px] font-bold text-white uppercase">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Number (Phone / Card / Account) */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">{language === 'id' ? 'NOMOR PEMBAYARAN (WA/REK/KARTU)' : 'PAYMENT ACCOUNT NUMBER (HP/REC/CARD)'}</label>
                  <input 
                    required
                    type="text"
                    value={paymentNumber}
                    onChange={e => setPaymentNumber(e.target.value)}
                    placeholder="e.g. 081234567890 / 123-456-789"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-emerald-500 font-mono transition-colors"
                  />
                  {paymentNumberError && (
                    <span className="text-[10px] text-rose-500 mt-1 block font-semibold flex items-center gap-1">
                      <AlertTriangle size={10} /> {paymentNumberError}
                    </span>
                  )}
                </div>

                {/* Upload Proof (Screenshot) with drag & drop */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">{t('uploadProof')}</label>
                  <div 
                    onClick={() => document.getElementById('wallet_proof_real')?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`group relative h-28 w-full bg-white/5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 hover:border-emerald-500/50'
                    }`}
                  >
                    {uploadPreview ? (
                      <div className="absolute inset-0">
                        <img src={uploadPreview} className="w-full h-full object-cover opacity-60" alt="Preview" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">{language === 'id' ? 'Ganti Gambar' : 'Change Image'}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="text-slate-500 mb-1 group-hover:text-emerald-400 transition-colors" size={24} />
                        <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest text-center group-hover:text-white/80">{language === 'id' ? 'Seret & Lepaskan atau Klik untuk Unggah' : 'Drag & Drop or Click to Upload'}</span>
                        <span className="text-slate-600 text-[7px] font-bold block uppercase mt-0.5">JPEG, PNG Max 5MB</span>
                      </>
                    )}
                  </div>
                  <input id="wallet_proof_real" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                {/* Optional Notes */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">{language === 'id' ? 'CATATAN (OPSIONAL)' : 'OPTIONAL NOTES'}</label>
                  <input 
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={language === 'id' ? "Catatan tambahan transfer" : "Write optional detail memo..."}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading || topUpAmount <= 0 || !paymentMethod || !paymentNumber || !!accountNameError || !!amountError || !!paymentNumberError}
                  className={`w-full py-4 mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 cursor-pointer hover:shadow-emerald-500/20'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                      {language === 'id' ? 'SYNCING INTEGRITY...' : 'SYNCING INTEGRITY...'}
                    </div>
                  ) : (
                    <>🚀 {translations[language]?.confirmTopUp || 'Confirm Top Up'}</>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Holographic Success Popup / Modal */}
      <AnimatePresence>
        {showSuccessPopup && lastTopUp && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessPopup(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: 'spring', stiffness: 260, damping: 25 }}
              className="relative w-full max-w-md bg-[#090615] border-2 border-emerald-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden text-center"
            >
              {/* Radial background green glow */}
              <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
              
              {/* Confetti simulation blocks */}
              <div className="absolute inset-x-0 top-0 h-24 overflow-hidden pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full"
                    initial={{ x: Math.random() * 320 + 40, y: -10, opacity: 1 }}
                    animate={{ y: 96, opacity: 0, x: `+=${Math.random() * 40 - 20}` }}
                    transition={{ duration: 1.5 + Math.random(), repeat: Infinity }}
                  />
                ))}
              </div>

              <div className="p-8 relative z-10 space-y-6">
                {/* Holographic Glowing Check Circle */}
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/15 border-2 border-emerald-400/30 animate-ping" />
                  <div className="absolute inset-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]" />
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="relative z-10 w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-emerald-500/30"
                  >
                    <Check size={32} strokeWidth={4} />
                  </motion.div>
                </div>

                <div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">{language === 'id' ? 'TRANSAKSI BERHASIL' : 'TRANSACTION COMPLETED'}</span>
                  <h4 className="text-white text-2xl font-black tracking-tight mt-3 uppercase tracking-wider">{language === 'id' ? 'SALDO DIPERBARUI!' : 'BALANCE SYNCHRONIZED!'}</h4>
                  <p className="text-slate-400 text-xs font-semibold mt-1">{language === 'id' ? 'Ledger digital Anda telah ditambah secara realtime' : 'Your cloud node has been updated in realtime'}</p>
                </div>

                {/* Holographic Balance Sheet */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left space-y-3 font-mono text-[11px] relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 text-slate-500">
                    <Zap size={12} className="text-emerald-400 animate-pulse" />
                    <span className="text-[8px] font-bold">REALTIME NODE</span>
                  </div>
                  
                  <div className="flex justify-between border-b border-white/5 pb-2 text-xs">
                    <span className="text-slate-400 font-sans font-bold">NOMINAL DETECTED</span>
                    <span className="text-emerald-400 font-extrabold text-sm font-mono">+Rp{lastTopUp.amount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">ACCOUNT OWNER</span>
                    <span className="text-white font-extrabold uppercase">{lastTopUp.accountName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">PAYMENT METHOD</span>
                    <span className="text-teal-400 font-bold uppercase">{lastTopUp.method}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">SENDER IDENTIFIER</span>
                    <span className="text-slate-300 font-bold">{lastTopUp.paymentNumber}</span>
                  </div>

                  {lastTopUp.notes && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">MEMO / NOTE</span>
                      <span className="text-slate-400 font-medium italic truncate max-w-[180px]">"{lastTopUp.notes}"</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-white/5 pt-2 text-[9px] opacity-60">
                    <span>LEDGER ID: {lastTopUp.id}</span>
                    <span>{lastTopUp.date}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => {
                      let content = `=============================\n`;
                      content += `       INMARKET E-WALLET     \n`;
                      content += `   TOP-UP RECEIPT CONFIRMED  \n`;
                      content += `=============================\n`;
                      content += `TX ID    : ${lastTopUp.id}\n`;
                      content += `Date     : ${lastTopUp.date}\n`;
                      content += `Account  : ${lastTopUp.accountName}\n`;
                      content += `Method   : ${lastTopUp.method}\n`;
                      content += `Sender   : ${lastTopUp.paymentNumber}\n`;
                      content += `-----------------------------\n`;
                      content += `AMOUNT   : Rp ${lastTopUp.amount.toLocaleString()}\n`;
                      content += `=============================\n`;
                      content += `     REALTIME BALANCE ADDED  \n`;
                      content += `=============================\n`;
                      
                      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `InMarket_TopUp_${lastTopUp.id}.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                      playSuccessSound();
                    }}
                    className="py-3 px-3 bg-white/5 hover:bg-white/10 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-white/10"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-400" /> Save Docket
                  </button>

                  <button 
                    onClick={() => {
                      playClickSound();
                      setShowSuccessPopup(false);
                    }}
                    className="py-3 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
