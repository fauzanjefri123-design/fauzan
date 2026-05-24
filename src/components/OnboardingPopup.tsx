import React, { useState } from 'react';
import { getPartitionedKey } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';
import { playSuccessSound } from '../lib/sounds';
import { ShieldCheck, Heart, Sparkles, Building2, User, Phone, MapPin, Briefcase } from 'lucide-react';
import { cn } from '../lib/utils';

export default function OnboardingPopup({ onComplete }: { onComplete: () => void }) {
  const { language, theme } = useThemeLanguage();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;

  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    businessType: 'Caffe'
  });

  const businessTypes = [
    { label: 'Caffe', value: 'Caffe' },
    { label: 'Restoran / Restaurant', value: 'Restoran' },
    { label: 'Laundry', value: 'Laundry' },
    { label: 'Mini Market', value: 'Mini Market' },
    { label: 'Toko Pakaian / Clothing Shop', value: 'Toko pakaian' },
    { label: 'Salon / Barbershop', value: 'Salon' },
    { label: 'Bengkel / Repair Shop', value: 'Bengkel' },
    { label: 'Usaha Sendiri / Freelance', value: 'Usaha sendiri' },
    { label: 'Lainnya / Others', value: 'Lainnya' }
  ];

  const motivationQuotes = [
    {
      id: "“Sukses tidak datang dari apa yang Anda lakukan sesekali, tetapi dari apa yang Anda lakukan secara konsisten.”",
      en: "“Success doesn't come from what you do occasionally, but from what you do consistently.”"
    },
    {
      id: "“Bisnis adalah permainan catur di mana kecerdasan AI berpadu dengan ketekunan kerja keras Anda.”",
      en: "“Business is a game of chess where AI intelligence harmonizes with your gritty hard work.”"
    },
    {
      id: "“Inovasi membedakan antara seorang pemimpin dan pengikut. Hari ini Anda memimpin bisnis Anda ke era 2026.”",
      en: "“Innovation distinguishes between a leader and a follower. Today you lead your business into 2026.”"
    }
  ];

  const [randomQuote] = useState(() => {
    const idx = Math.floor(Math.random() * motivationQuotes.length);
    return motivationQuotes[idx];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessSound();
    // Cache onboarding details
    const businessKey = getPartitionedKey('inmarket_business', true);
    localStorage.setItem(businessKey, JSON.stringify(formData));
    setStep(2);
  };

  const handleStart = () => {
    playSuccessSound();
    onComplete();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#030107]/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 select-none"
      >
        <motion.div 
          initial={{ scale: 0.92, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          className={cn(
            "p-8 rounded-[36px] w-full max-w-xl border shadow-2xl relative overflow-hidden transition-all duration-300",
            theme === 'light' 
              ? "bg-white border-indigo-100 text-slate-900" 
              : "bg-slate-950/85 border-violet-500/20 text-white"
          )}
          style={{
            boxShadow: theme === 'dark' 
              ? '0 0 50px rgba(139,92,246,0.15), inset 0 0 15px rgba(139,92,246,0.05)'
              : '0 30px 60px -15px rgba(99,102,241,0.2)'
          }}
        >
          {/* Subtle lighting overlay */}
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-xl" />

          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center relative">
                <div className="inline-flex p-3 bg-violet-600/10 rounded-2xl border border-violet-500/20 mb-3 text-violet-500 dark:text-violet-400">
                  <Building2 size={24} className="animate-pulse" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">{t('onboardingTitle')}</h2>
                <p className="text-xs opacity-70 mt-1 font-semibold">{t('onboardingSub')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                
                {/* 1. Shop Name */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><Building2 size={16} /></div>
                  <input 
                    required 
                    type="text"
                    value={formData.businessName}
                    placeholder={t('businessName')} 
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                    className="w-full p-3.5 pl-11 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl font-bold text-xs outline-none focus:border-violet-500" 
                  />
                </div>

                {/* 2. Owner Name */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><User size={16} /></div>
                  <input 
                    required 
                    type="text"
                    value={formData.ownerName}
                    placeholder={t('ownerNamePh')} 
                    onChange={e => setFormData({...formData, ownerName: e.target.value})}
                    className="w-full p-3.5 pl-11 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl font-bold text-xs outline-none focus:border-violet-500" 
                  />
                </div>

                {/* 3. Business Email */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><Sparkles size={16} /></div>
                  <input 
                    required 
                    type="email"
                    value={formData.email}
                    placeholder={t('businessEmailPh')} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3.5 pl-11 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl font-bold text-xs outline-none focus:border-violet-500" 
                  />
                </div>

                {/* 4. Phone Contact */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><Phone size={16} /></div>
                  <input 
                    required 
                    type="text"
                    value={formData.phone}
                    placeholder={t('phoneNumber')} 
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-3.5 pl-11 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl font-bold text-xs outline-none focus:border-violet-500" 
                  />
                </div>

                {/* 5. City / Cabang */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><MapPin size={16} /></div>
                  <input 
                    required 
                    type="text"
                    value={formData.city}
                    placeholder={t('businessCityPh')} 
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full p-3.5 pl-11 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl font-bold text-xs outline-none focus:border-violet-500" 
                  />
                </div>

                {/* 5b. Address / Alamat */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40"><MapPin size={16} /></div>
                  <input 
                    required 
                    type="text"
                    value={formData.address}
                    placeholder={t('businessAddressPh')} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full p-3.5 pl-11 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl font-bold text-xs outline-none focus:border-violet-500" 
                  />
                </div>

                {/* 6. Business Category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase opacity-60 tracking-wider flex items-center gap-1.5"><Briefcase size={12} /> {t('businessDescription')}</label>
                  <select 
                    value={formData.businessType}
                    onChange={e => setFormData({...formData, businessType: e.target.value})}
                    className="w-full p-3.5 bg-slate-900 text-white border border-indigo-100/10 rounded-xl font-bold text-xs outline-none focus:border-violet-500"
                  >
                    {businessTypes.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-slate-950 text-white font-semibold text-xs py-2">{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    className="w-full py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-black text-xs tracking-widest uppercase rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all cursor-pointer"
                  >
                    🚀 {t('sinkronisasikanNilai')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-emerald-400">
                <ShieldCheck size={48} className="animate-bounce" />
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 tracking-tight">
                  {t('successOnboard')}
                </h2>
                <p className="text-xs opacity-60 mt-2 font-bold font-mono">
                  SUITE ID: INMARKET_{formData.businessName.toUpperCase().replace(/\s+/g, '_')}
                </p>
              </div>

              {/* Motivation banner cards */}
              <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center relative overflow-hidden">
                <div className="absolute top-1 right-2 inline-flex text-violet-400"><Heart size={14} /></div>
                <h4 className="text-[10px] font-black tracking-widest uppercase opacity-40 text-indigo-400 mb-2">{t('motivationTitle')}</h4>
                <p className="text-xs md:text-sm font-semibold tracking-tight italic text-indigo-950 dark:text-indigo-200">
                  {language === 'id' ? randomQuote.id : randomQuote.en}
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleStart}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs tracking-widest uppercase rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                >
                  🚀 {t('startManageBtn')}
                </button>
              </div>
            </div>
          )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
