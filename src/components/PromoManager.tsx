import React, { useState, useEffect } from 'react';
import { getPartitionedKey } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Percent, Gift, Flame, Zap, Plus, Trash2, Clock, Sparkles, 
  Tag, Compass, Calendar, Volume2, ShieldAlert
} from 'lucide-react';
import { playClickSound, playSuccessSound } from '../lib/sounds';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';

interface Coupon {
  id: string;
  code: string;
  type: 'diskon' | 'cashback' | 'promo_harian' | 'voucher' | 'buy_1_get_1' | 'flash_sale';
  value: number; // percentage or flat idr
  description: string;
  expiresAt: string; // date string
}

const DEFAULT_COUPONS: Coupon[] = [
  { id: 'cp1', code: 'CYBERNEON26', type: 'diskon', value: 20, description: 'Diskon 20% khusus pembayaran e-wallet untuk Espresso & Latte.', expiresAt: '2026-06-30' },
  { id: 'cp2', code: 'FLASHMONDAY', type: 'flash_sale', value: 50, description: 'Flash Sale Gila Mandiri 50% Matcha Uji Latte.', expiresAt: '2026-05-25' },
  { id: 'cp3', code: 'KASIRCASHBACK', type: 'cashback', value: 15000, description: 'Cashback Flat Rp15.000 saldo member kualifikasi belanja Rp100.000.', expiresAt: '2026-06-15' },
  { id: 'cp4', code: 'COFFEEBOGO', type: 'buy_1_get_1', value: 1, description: 'Beli 1 gratis 1 untuk semua varian Pastry / Croissants.', expiresAt: '2026-05-31' }
];

export default function PromoManager() {
  const { language } = useThemeLanguage();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    const key = getPartitionedKey('inmarket_coupons_data', false);
    const saved = localStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [code, setCode] = useState('');
  const [type, setType] = useState<Coupon['type']>('diskon');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('2026-05-31');

  // Flash Sale countdown computation state
  const [timeLeft, setTimeLeft] = useState({ Jam: 5, Menit: 24, Detik: 39 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.Detik > 0) {
          return { ...prev, Detik: prev.Detik - 1 };
        } else if (prev.Menit > 0) {
          return { ...prev, Menit: prev.Menit - 1, Detik: 59 };
        } else if (prev.Jam > 0) {
          return { Jam: prev.Jam - 1, Menit: 59, Detik: 59 };
        } else {
          return { Jam: 0, Menit: 0, Detik: 0 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const saveCoupons = (data: Coupon[]) => {
    setCoupons(data);
    const key = getPartitionedKey('inmarket_coupons_data', false);
    localStorage.setItem(key, JSON.stringify(data));
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !value) return;

    const newCp: Coupon = {
      id: 'cp_' + Date.now(),
      code: code.toUpperCase().trim(),
      type,
      value: Number(value),
      description: description || 'Promosi musiman spektakuler.',
      expiresAt: expiresAt || '2026-06-30'
    };

    const updated = [newCp, ...coupons];
    saveCoupons(updated);
    playSuccessSound();

    // Reset Form
    setCode('');
    setValue('');
    setDescription('');
  };

  const handleDeleteCoupon = (id: string) => {
    if (confirm('Yakin ingin menarik voucher promosi ini?')) {
      const filtered = coupons.filter(c => c.id !== id);
      saveCoupons(filtered);
      playClickSound();
    }
  };

  const getPromoColorClass = (t: Coupon['type']) => {
    switch (t) {
      case 'flash_sale': return 'from-rose-500 to-pink-600 border-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] text-red-100';
      case 'buy_1_get_1': return 'from-amber-400 to-orange-500 border-orange-500 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] text-orange-100';
      case 'cashback': return 'from-cyan-500 to-blue-600 border-cyan-500 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] text-cyan-100';
      case 'promo_harian': return 'from-teal-400 to-emerald-600 border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] text-emerald-100';
      default: return 'from-violet-500 to-indigo-650 border-violet-500 hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] text-violet-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Flame className="text-rose-500 animate-pulse" /> {t('kampanyePromosi')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('promoManagementInfo')}
          </p>
        </div>
      </div>

      {/* DETAILED FLASH SALE INTERACTIVE COUNTDOWN BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 to-[#120a2e] text-white border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="absolute top-[-30px] right-[-30px] w-44 h-44 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="space-y-2 text-center md:text-left relative z-10">
          <span className="px-3 py-1 bg-red-600 text-[10px] uppercase font-black tracking-widest rounded-full animate-bounce inline-block">
            {t('flashSaleExtreme')}
          </span>
          <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-rose-400">
            {t('flashSaleInfo')}
          </h3>
          <p className="text-[11px] text-zinc-300 flex items-center justify-center md:justify-start gap-1">
            <Clock size={12} className="text-rose-400 animate-spin" style={{ animationDuration: '4s' }} /> {t('endsSoon')}
          </p>
        </div>

        {/* Real Countdown timer block */}
        <div className="flex items-center gap-2 font-mono relative z-10">
          <div className="bg-black/50 border border-rose-500/40 p-3 rounded-2xl w-14 text-center">
            <span className="text-lg font-black tracking-wider text-rose-450 block">0{timeLeft.Jam}</span>
            <span className="text-[8px] text-zinc-400">{t('hours')}</span>
          </div>
          <span className="text-lg font-black text-rose-500 flex animate-ping">:</span>
          <div className="bg-black/50 border border-rose-500/40 p-3 rounded-2xl w-14 text-center">
            <span className="text-lg font-black tracking-wider text-rose-450 block">
              {timeLeft.Menit < 10 ? `0${timeLeft.Menit}` : timeLeft.Menit}
            </span>
            <span className="text-[8px] text-zinc-400">{t('mins')}</span>
          </div>
          <span className="text-lg font-black text-rose-500 flex animate-ping">:</span>
          <div className="bg-black/50 border border-rose-500/40 p-3 rounded-2xl w-14 text-center">
            <span className="text-lg font-black tracking-wider text-amber-400 block">
              {timeLeft.Detik < 10 ? `0${timeLeft.Detik}` : timeLeft.Detik}
            </span>
            <span className="text-[8px] text-zinc-400">{t('secs')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Creation Input Section */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-[#0c0817]/60 border border-indigo-100/10">
          <h3 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-4">{t('buatKuponCampaign')}</h3>
          <form onSubmit={handleCreateCoupon} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('kodeCoupon')}</label>
              <input 
                required 
                type="text" 
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder={t('phInput')}
                className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white uppercase focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('tipePromosi')}</label>
              <select 
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full p-2.5 bg-[#0d0721] border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-white focus:border-rose-500"
              >
                <option value="diskon">{t('diskonPersentase')}</option>
                <option value="cashback">{t('cashbackFlat')}</option>
                <option value="buy_1_get_1">{t('buy1Get1')}</option>
                <option value="flash_sale">{t('flashSaleKilat')}</option>
                <option value="voucher">{t('voucherPemotongan')}</option>
                <option value="promo_harian">{t('promoHarian')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('nilaiJumlah')}</label>
                <input 
                  required
                  type="number" 
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={t('phInput')}
                  className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('expiredDate')}</label>
                <input 
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('deskripsiCampaign')}</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={t('phInput')}
                rows={2}
                className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-rose-500"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition"
            >
              <Plus size={14} /> {t('liveKanPromo')}
            </button>
          </form>
        </div>

        {/* Promo Coupons Grid Display */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {coupons.map(c => (
              <div 
                key={c.id}
                className={`p-5 rounded-3xl border text-white bg-gradient-to-br ${getPromoColorClass(c.type)} flex flex-col justify-between h-44 relative overflow-hidden transition duration-300 transform hover:-translate-y-1`}
              >
                {/* Decorative glow sticker */}
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/10 rounded-full blur-lg" />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] tracking-widest bg-black/40 px-2 py-0.5 rounded border border-white/15">
                      {c.type.toUpperCase().replace(/_/g, " ")}
                    </span>
                    <button 
                      onClick={() => handleDeleteCoupon(c.id)}
                      className="text-white hover:text-rose-200 transition"
                      title="Hapus / Nonaktifkan kupon"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <h4 className="text-sm font-black font-mono tracking-wider">{c.code}</h4>
                  <p className="text-[10px] opacity-90 line-clamp-2 leading-relaxed">{c.description}</p>
                </div>

                <div className="flex justify-between items-end border-t border-white/10 pt-2 shrink-0">
                  <div>
                    <span className="text-[8px] opacity-50 block font-mono">{t('batasExpired')}</span>
                    <strong className="text-[10px] font-mono">{c.expiresAt}</strong>
                  </div>
                  <div>
                    <span className="text-[8px] opacity-50 block text-right">{t('benefit')}</span>
                    <strong className="text-sm font-extrabold">
                      {c.type === 'buy_1_get_1' ? 'GET 1 FREE 🔥' : c.type === 'cashback' ? `Rp${c.value.toLocaleString()}` : `${c.value}% OFF`}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
