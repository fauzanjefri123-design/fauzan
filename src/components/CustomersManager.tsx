import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, Phone, Mail, MapPin, Award, Trash2, Search, Zap, 
  QrCode, Ticket, Percent, Sparkles, Trophy, Plus, ArrowUpRight, AlertTriangle, Loader2
} from 'lucide-react';
import { playClickSound, playSuccessSound } from '../lib/sounds';
import { cn, getPartitionedKey, safeJsonParse } from '../lib/utils';
import QRScanner from './QRScanner';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';
import { useAuth } from '../context/AuthContext';
import { getCustomers, addCustomer, deleteCustomer } from '../lib/firestoreService';
import ConfirmDialog from './ConfirmDialog';
import { validatePhone, validateEmail, sanitizeInput } from '../lib/validation';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  photoUrl: string;
  totalSpent: number;
  points: number;
  memberLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  shoppingHistory: { id: string; date: string; amount: number; items: string }[];
  cashbackBalance: number;
}

export default function CustomersManager() {
  const { language } = useThemeLanguage();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;
  const { userData } = useAuth();
  const ownerId = userData?.ownerId || '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Firestore Customer Sync
  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = getCustomers(
      ownerId,
      (data) => {
        setCustomers(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [ownerId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCrmScannerActive, setIsCrmScannerActive] = useState(false);

  const handleCrmScan = (text: string) => {
    const found = customers.find(c => 
      c.id === text || 
      c.phone === text || 
      c.email.toLowerCase() === text.toLowerCase() ||
      c.name.toLowerCase() === text.toLowerCase()
    );

    if (found) {
      setSelectedCustomer(found);
      setSearchQuery('');
      setIsCrmScannerActive(false);
      playSuccessSound();
    } else {
      alert(`Kartu anggota / ID "${text}" tidak terdaftar di database pelanggan.`);
    }
  };
  
  // New Customer Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [memberLevel, setMemberLevel] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum'>('Bronze');
  const [points, setPoints] = useState('0');
  const [totalSpent, setTotalSpent] = useState('0');
  const [cashback, setCashback] = useState('0');

  // Input validations
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (name) {
      if (name.trim().length === 0) setNameError('Nama pelanggan wajib diisi');
      else if (name.length > 50) setNameError('Nama pelanggan maksimal 50 karakter');
      else setNameError(null);
    } else {
      setNameError(null);
    }
  }, [name]);

  useEffect(() => {
    if (phone) {
      const err = validatePhone(phone, true);
      setPhoneError(err);
    } else {
      setPhoneError(null);
    }
  }, [phone]);

  useEffect(() => {
    if (email) {
      const err = validateEmail(email, false);
      setEmailError(err);
    } else {
      setEmailError(null);
    }
  }, [email]);

  // Confirm delete dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemId: string | null;
  }>({ open: false, itemId: null });

  // Load selected customer by default if empty
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers, selectedCustomer]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId || submitting) return;

    if (!name) { setNameError('Nama wajib diisi'); return; }
    const errPhone = validatePhone(phone, true);
    if (errPhone) { setPhoneError(errPhone); return; }

    const errEmail = validateEmail(email, false);
    if (errEmail) { setEmailError(errEmail); return; }

    setSubmitting(true);
    try {
      const newCust = {
        name: sanitizeInput(name),
        phone: sanitizeInput(phone),
        email: sanitizeInput(email) || 'customer@inmarket.com',
        address: sanitizeInput(address) || 'N/A',
        photoUrl: sanitizeInput(photoUrl) || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999999)}?w=150&auto=format&fit=crop&q=80`,
        totalSpent: Number(totalSpent) || 0,
        points: Number(points) || 0,
        memberLevel,
        shoppingHistory: [],
        cashbackBalance: Number(cashback) || 0
      };

      const docId = await addCustomer(ownerId, newCust);
      if (docId) {
        setSelectedCustomer({ id: docId, ...newCust });
      }
      setShowAddForm(false);
      playSuccessSound();

      // Reset Form
      setName(''); setPhone(''); setEmail(''); setAddress(''); setPhotoUrl('');
      setMemberLevel('Bronze'); setPoints('0'); setTotalSpent('0'); setCashback('0');
      setNameError(null); setPhoneError(null); setEmailError(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerDeleteConfirm = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDialog({ open: true, itemId: id });
  };

  const handleConfirmDelete = async () => {
    const id = confirmDialog.itemId;
    if (id && ownerId) {
      try {
        await deleteCustomer(ownerId, id);
        playClickSound();
        if (selectedCustomer?.id === id) {
          const remaining = customers.filter(c => c.id !== id);
          setSelectedCustomer(remaining.length > 0 ? remaining[0] : null);
        }
      } catch (err) {
        console.error(err);
      }
    }
    setConfirmDialog({ open: false, itemId: null });
  };

  const getLevelBadgeColors = (lvl: string) => {
    switch (lvl) {
      case 'Platinum':
        return 'from-cyan-400 to-indigo-500 bg-clip-text text-transparent shadow-cyan-500/20 shadow-glow border-cyan-400/50';
      case 'Gold':
        return 'from-amber-400 to-yellow-600 bg-clip-text text-transparent shadow-amber-500/20 shadow-glow border-amber-400/50';
      case 'Silver':
        return 'from-slate-300 to-slate-400 text-slate-200 border-slate-350/50';
      case 'Bronze':
      default:
        return 'from-orange-500 to-orange-700 text-orange-400 border-orange-500/40';
    }
  };

  const getLoyaltyAIRecommendation = (c: Customer) => {
    const isLoyal = c.totalSpent > 1000000 || c.points >= 300 || c.shoppingHistory.length > 3;
    if (isLoyal) {
      return {
        loyal: true,
        text: t('loyalRec'),
        badge: t('loyalStatus')
      };
    } else {
      return {
        loyal: false,
        text: t('regulerRec'),
        badge: t('regulerStatus')
      };
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Users className="text-violet-500" /> {t('databasePelanggan')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('crmIntegratedInfo')}
          </p>
        </div>
        <button 
          onClick={() => { playClickSound(); setShowAddForm(true); }}
          className="py-2.5 px-4 bg-violet-600 hover:bg-violet-700 rounded-xl text-xs font-black uppercase text-white flex items-center gap-2 transition duration-200 shadow-md transform hover:-translate-y-0.5"
        >
          <UserPlus size={16} /> {t('tambahPelanggan')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Customer List Search */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder={t('phSearch')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white"
              />
            </div>
            <button
              onClick={() => { playClickSound(); setIsCrmScannerActive(!isCrmScannerActive); }}
              className={cn(
                "p-3 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0",
                isCrmScannerActive 
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400" 
                  : "bg-violet-600/10 border-violet-500/20 text-violet-400 hover:bg-violet-600/20"
              )}
              title={t('pinadaiKartuMember')}
            >
              <QrCode size={18} className={isCrmScannerActive ? "animate-pulse" : ""} />
            </button>
          </div>

          {/* Collapsible QR Scanner for Customers */}
          {isCrmScannerActive && (
            <div className="p-4 bg-violet-500/5 border border-violet-500/15 rounded-2xl">
              <span className="text-[10px] font-mono font-bold text-violet-400 block mb-2 uppercase">{t('pinadaiKartuMember')}</span>
              <QRScanner
                onScanSuccess={handleCrmScan}
                placeholderText={t('phSearch')}
              />
            </div>
          )}

          <div className="p-4 rounded-3xl bg-white dark:bg-[#0c0817]/60 border border-indigo-100/10 max-h-[500px] overflow-y-auto space-y-2 custom-scrollbar">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-violet-550" size={24} />
                <span className="text-[10px] text-slate-400 font-mono font-bold">LOADING_CLOUD_CRM...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20">
                  <Users className="text-indigo-400" size={32} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                  {language === 'id' ? 'Belum Ada Pelanggan' : 'No Customers Found'}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[200px] leading-relaxed mb-6">
                  {language === 'id' 
                    ? 'Daftar pelanggan Anda kosong. Tambahkan pelanggan untuk mulai mengelola CRM.' 
                    : 'Your customer list is empty. Add customers to start managing your CRM.'}
                </p>
                <div className="flex flex-col gap-2 w-full">
                  <button 
                    onClick={() => { playClickSound(); setShowAddForm(true); }}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 rounded-xl text-[10px] font-black uppercase text-white shadow-sm transition active:scale-95 text-center block"
                  >
                    <Plus size={14} className="inline mr-1" /> {t('tambahPelanggan')}
                  </button>
                </div>
              </div>
            ) : (
              filtered.map(c => {
                const isSelected = selectedCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => { playClickSound(); setSelectedCustomer(c); }}
                    className={`p-3 rounded-2xl border transition duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected 
                        ? "bg-violet-600/15 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)] text-slate-900 dark:text-white" 
                        : "bg-transparent border-indigo-100/5 text-slate-600 dark:text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={c.photoUrl} 
                        alt={c.name}
                        className="w-10 h-10 rounded-full object-cover border border-violet-500/20"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-xs font-bold">{c.name}</h4>
                        <span className="text-[9px] opacity-40 font-mono block mt-0.5">{c.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] tracking-widest uppercase px-2 py-0.5 rounded-full font-bold border ${getLevelBadgeColors(c.memberLevel)}`}>
                        {c.memberLevel}
                      </span>
                      <button 
                        onClick={(e) => triggerDeleteConfirm(c.id, e)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-md transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Holographic Profiling */}
        <div className="lg:col-span-7">
          {selectedCustomer ? (
            <div className="p-6 rounded-3xl bg-[#090615]/80 text-white border border-violet-500/30 shadow-[0_0_25px_rgba(139,92,246,0.15)] relative overflow-hidden space-y-6">
              {/* Decorative Hologram grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,10,36,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(18,10,36,0.15)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />
              
              <div className="flex flex-col sm:flex-row items-center gap-5 justify-between relative z-10 border-b border-white/5 pb-5">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="relative">
                    <img 
                      src={selectedCustomer.photoUrl} 
                      alt={selectedCustomer.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-violet-600 rounded-full p-1.5 border border-slate-950 text-white">
                      <Award size={10} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">{selectedCustomer.name}</h3>
                    <p className="text-[10px] opacity-50 font-mono mt-0.5">{selectedCustomer.email}</p>
                    <p className="text-[10px] opacity-65 flex items-center gap-1.5 mt-1 sm:justify-start justify-center">
                      <MapPin size={10} className="text-rose-400" /> {selectedCustomer.address}
                    </p>
                  </div>
                </div>

                {/* Cyber badge rating */}
                <div className="text-center sm:text-right shrink-0">
                  <span className={`text-[10px] tracking-widest uppercase font-black px-4 py-1 rounded-full border bg-zinc-950/80 block ${getLevelBadgeColors(selectedCustomer.memberLevel)}`}>
                    🛡️ {selectedCustomer.memberLevel} MEMBER
                  </span>
                  <span className="text-[9px] opacity-40 mt-1 block font-mono">ID: {selectedCustomer.id}</span>
                </div>
              </div>

              {/* CRM Stats widget row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-violet-500/30 transition duration-300">
                  <span className="text-[9px] opacity-50 uppercase block font-mono">{t('totalTransaksi')}</span>
                  <strong className="text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-300">
                    Rp{selectedCustomer.totalSpent.toLocaleString()}
                  </strong>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-violet-500/30 transition duration-300">
                  <span className="text-[9px] opacity-50 uppercase block font-mono">{t('loyaltyPoints')}</span>
                  <strong className="text-sm tracking-wide text-emerald-400 flex items-center gap-1">
                    <Trophy size={14} /> {selectedCustomer.points} PTS
                  </strong>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-violet-500/30 transition duration-300">
                  <span className="text-[9px] opacity-50 uppercase block font-mono">{t('cashbackBalance')}</span>
                  <strong className="text-sm tracking-wide text-cyan-400">
                    Rp{selectedCustomer.cashbackBalance.toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Holographic loyalty & QR system */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 pt-2">
                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-violet-500/20 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-violet-400 flex items-center gap-1.5">
                    <QrCode size={12} /> MEMBER QR / VOUCHER
                  </h4>
                  <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="bg-white p-1 rounded">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedCustomer.id}`}
                        alt="Customer QR Code"
                        className="w-14 h-14"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-300 block font-bold">Member QR-Key</span>
                      <span className="text-[8px] font-mono text-zinc-500 block">SCAN_VAL: CRM-{selectedCustomer.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-[8px] text-pink-400 font-bold block flex items-center gap-0.5">
                        <Ticket size={8} /> Cashback: 5% (Diskon Member)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-violet-500/20 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-violet-400 flex items-center gap-1.5">
                    <Sparkles size={12} /> AI CO-PILOT ANALYSIS
                  </h4>
                  <div className="bg-violet-950/20 border border-violet-400/20 p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-400">Kredibilitas Profil</span>
                      <span className="text-[9px] font-mono font-bold text-violet-300">
                        {getLoyaltyAIRecommendation(selectedCustomer).badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-300 leading-normal italic font-semibold">
                      "{getLoyaltyAIRecommendation(selectedCustomer).text}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Shopping History tracking */}
              <div className="space-y-3 relative z-10">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-violet-400">{t('riwayatBelanja')}</h4>
                <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                  {(!selectedCustomer.shoppingHistory || selectedCustomer.shoppingHistory.length === 0) ? (
                    <div className="py-4 text-center text-[10px] opacity-40 italic">{t('noActivity')}</div>
                  ) : (
                    (selectedCustomer.shoppingHistory || []).map(hist => (
                      <div 
                        key={hist.id}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs hover:bg-white/10 transition"
                      >
                        <div>
                          <p className="font-bold text-zinc-200 truncate max-w-[200px]">{hist.items}</p>
                          <span className="text-[9px] opacity-40 font-mono block mt-0.5">{hist.date}</span>
                        </div>
                        <span className="font-extrabold text-[#dfb857] shrink-0">Rp{hist.amount.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center border border-indigo-100/10 rounded-3xl bg-white/5 text-slate-400">
              <Users size={32} className="animate-pulse mb-3" />
              <p className="text-xs">{t('pilihPelangganInfo')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Add Customer Drawer */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 bg-[#090615]/95 rounded-3xl border border-violet-500/30 text-white space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-violet-400">{t('tambahPelanggan')}</h3>
                <button 
                  onClick={() => { playClickSound(); setShowAddForm(false); }}
                  className="p-1 rounded-lg hover:bg-white/10"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('namaPelanggan')} *</label>
                  <input 
                    required 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t('phInput')}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none text-white focus:border-violet-500"
                  />
                  {nameError && (
                    <span className="text-[10px] text-rose-500 mt-1 block font-semibold flex items-center gap-1">
                      <AlertTriangle size={10} /> {nameError}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('nomorHp')} *</label>
                  <input 
                    required 
                    type="text" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0812xxxxxx"
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none text-white focus:border-violet-500"
                  />
                  {phoneError && (
                    <span className="text-[10px] text-rose-500 mt-1 block font-semibold flex items-center gap-1">
                      <AlertTriangle size={10} /> {phoneError}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('emailElit')}</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('phInput')}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none text-white focus:border-violet-500"
                  />
                  {emailError && (
                    <span className="text-[10px] text-rose-500 mt-1 block font-semibold flex items-center gap-1">
                      <AlertTriangle size={10} /> {emailError}
                    </span>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('alamatLengkap')}</label>
                  <input 
                    type="text" 
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder={t('phInput')}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none text-white focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('memberLevel')}</label>
                  <select 
                    value={memberLevel}
                    onChange={e => setMemberLevel(e.target.value as any)}
                    className="w-full p-3 bg-[#0d0721] border border-white/10 rounded-xl text-sm outline-none text-white focus:border-violet-500"
                  >
                    <option value="Bronze">Bronze (Diskon 0%)</option>
                    <option value="Silver">Silver (Diskon 2%)</option>
                    <option value="Gold">Gold (Diskon 5%)</option>
                    <option value="Platinum">Platinum (Diskon 8%)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('initialRewardPoints')}</label>
                  <input 
                    type="number" 
                    value={points}
                    onChange={e => setPoints(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('totalTrans')}</label>
                  <input 
                    type="number" 
                    value={totalSpent}
                    onChange={e => setTotalSpent(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('initialCashback')}</label>
                  <input 
                    type="number" 
                    value={cashback}
                    onChange={e => setCashback(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none text-white"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submitting || !!nameError || !!phoneError || !!emailError || !name || !phone}
                  className="col-span-2 py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> {t('menyimpan')}...
                    </>
                  ) : (
                    <>
                      🚀 {t('simpanPelanggan')}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title="Hapus Data Pelanggan"
        message="Apakah Anda yakin ingin menghapus data profil pelanggan ini secara permanen dari Cloud database?"
        confirmLabel="Hapus"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ open: false, itemId: null })}
        variant="danger"
      />
    </div>
  );
}
