import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  Zap, 
  Mail, 
  Instagram, 
  MessageCircle, 
  ArrowRight, 
  Package, 
  Wallet, 
  LayoutDashboard, 
  BrainCircuit, 
  ShieldCheck, 
  Lock, 
  Compass, 
  HelpCircle, 
  ChevronDown, 
  MessageSquareQuote,
  Star,
  Sparkles,
  Terminal,
  MessageSquareCode,
  Bot,
  Volume2,
  Tv
} from 'lucide-react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import ThemeLanguageSwitcher from './ThemeLanguageSwitcher';
import { translations } from '../lib/translations';
import { playSuccessSound, playClickSound, playScanSound } from '../lib/sounds';
import { getPartitionedKey } from '../lib/utils';
import { createSignedOfflineSession } from '../lib/validation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  color: string;
}

export default function LandingPage({ onNavigate }: { onNavigate: (view: any) => void }) {
  const { language, theme, setLanguage, t } = useThemeLanguage();

  // Scroll tracking for cinematic parallax transitions
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Formulated metrics counter effect
  const [metricCounts, setMetricCounts] = useState({ transactions: 11420, businesses: 320, satisfaction: 94 });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetricCounts(prev => ({
        transactions: prev.transactions < 342500 ? prev.transactions + Math.floor(Math.random() * 450) + 180 : 342500,
        businesses: prev.businesses < 1580 ? prev.businesses + Math.floor(Math.random() * 3) + 1 : 1580,
        satisfaction: 99
      }));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Demo Guest login bypassing standard auth flows
  const handleDemoGuestLogin = () => {
    playSuccessSound();
    playScanSound();
    
    // Create pre-auth offline session state
    const demoUser = createSignedOfflineSession({
      uid: 'offline_guest_2026',
      email: 'guest@inmarket.id',
      displayName: language === 'id' ? 'Tamu Demo' : 'Demo Guest',
      role: 'Owner'
    });
    
    localStorage.setItem('offline_logged_in_user', JSON.stringify(demoUser));
    
    // Pre-populate business data if not existing
    const businessKey = getPartitionedKey('inmarket_business', true);
    if (!localStorage.getItem(businessKey)) {
      localStorage.setItem(businessKey, JSON.stringify({
        businessName: 'InMarket Lounge Ltd',
        phone: '0812-3456-7890',
        country: 'Indonesia',
        description: 'F&B Cafe & Retail'
      }));
    }
    
    // Smooth transition straight into the system workspace
    onNavigate('dashboard');
  };

  // Sound testing trigger
  const handleTestChime = () => {
    playSuccessSound();
  };

  // FAQ collapse active state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Background animated particles coordinator
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  useEffect(() => {
    const colors = [
      'rgba(168, 85, 247, 0.45)', // Neon Purple
      'rgba(34, 211, 238, 0.45)', // Holographic Blue
      'rgba(236, 72, 153, 0.35)', // Cyber Pink
    ];
    const generated = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 5 + 3,
      speedY: -(Math.random() * 0.7 + 0.3),
      speedX: (Math.random() * 0.4 - 0.2),
      color: colors[i % colors.length]
    }));
    setParticles(generated);
  }, []);

  // Spline loaded tracking indicator
  const [splineLoaded, setSplineLoaded] = useState(false);

  // Headline typewriter effect states
  const taglineFullId = "“Smart Business Operating System”";
  const taglineFullEn = "“Smart Business Operating System”";
  const taglineText = taglineFullId;
  const [typedTagline, setTypedTagline] = useState('');

  useEffect(() => {
    let i = 0;
    setTypedTagline('');
    const timer = setInterval(() => {
      if (i < taglineText.length) {
        setTypedTagline((prev) => prev + taglineText.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 55);
    return () => clearInterval(timer);
  }, [language, taglineText]);

  // AI Assistant dialog loop state
  const [aiOpen, setAiOpen] = useState(true);
  const [aiTyping, setAiTyping] = useState(false);
  const [aiMessage, setAiMessage] = useState(
    language === 'id' 
      ? "Selamat datang di InMarket.id! Saya AI Bisnis Anda. Sistem bisnis modern untuk owner dan karyawan." 
      : "Welcome to InMarket.id! I am your companion engine. A modern business operation setup for owners and staff."
  );

  const handleAiQuestion = (topic: string) => {
    playClickSound();
    setAiTyping(true);
    
    let answer = "";
    if (topic === 'about') {
      answer = language === 'id'
        ? "InMarket.id adalah Quantum operating system modern tahun 2026 yang mengotomasi kasir, inventaris, absensi dengan selfie biometrik, laporan laba rugi instan dengan perlindungan isolasi cloud penuh!"
        : "InMarket.id is a sleek 2026 workspace optimizing core POS, automated inventory controls, selfie workforce clocks, and instant profit analysis with cloud sandbox isolation!";
    } else if (topic === 'analytics') {
      answer = language === 'id'
        ? "Analytics kami berjalan real-time! Anda mendapatkan grafik pergerakan omset, diagram pengeluaran, perhitungan estimasi pajak otomatis, serta prediksi restock barang bertenaga AI model!"
        : "Analytics flow at real-time speeds! You receive gross earnings scales, operations margins tracking, automated tax estimates, and predictive AI restock thresholds!";
    } else if (topic === 'qris') {
      answer = language === 'id'
        ? "Kasir terintegrasi penuh! Mendukung Cash, QRIS statis 2026, transfer bank, tagihan invoice otomatis, serta dilengkapi efek suara chimes pos retail premium!"
        : "POS ledger is fully unified! Supports Cash, static QRIS 2026 vectors, wire transfers, direct invoicing, with high-fidelity retail beep audios!";
    } else {
      answer = language === 'id' ? "Sistem AI kami siap mendampingi operasional toko Anda 24/7!" : "Our neural cloud architecture stands ready to scale your local franchise assets 24/7!";
    }

    setTimeout(() => {
      setAiMessage(answer);
      setAiTyping(false);
      playScanSound();
    }, 850);
  };

  const liveChartData = [
    { name: '08:00', sales: 2400 },
    { name: '10:00', sales: 5800 },
    { name: '12:00', sales: 11200 },
    { name: '14:00', sales: 8900 },
    { name: '16:00', sales: 15400 },
    { name: '18:00', sales: 22800 },
    { name: '20:00', sales: 31500 }
  ];

  const faqs = [
    {
      q: language === 'id' ? "Apa itu InMarket.id?" : "What is InMarket.id?",
      a: language === 'id' 
        ? "InMarket.id adalah sistem operasi operasi bisnis modular (SaaS) yang menggabungkan kasir digital POS, manajemen stok multi-kategori, sistem gaji & absensi selfie karyawan, dan asisten AI prediktif untuk menumbuhkan margin laba UMKM."
        : "InMarket.id is a modular workspace syncing point-of-sale checkout, multi-tier inventory controls, biometric worker dockets (payroll/selfies), and predictive AI models to accelerate commercial yields."
    },
    {
      q: language === 'id' ? "Apakah sistem InMarket.id aman?" : "Is InMarket.id secure?",
      a: language === 'id' 
        ? "Sangat aman. Data usaha terenkripsi di enkripsi cloud Firebase premium, diisolasi aman per-instansi, serta dioperasikan di bawah proteksi mutakhir Sandbox."
        : "Highly secure. Encoded on Firebase clouds, logically isolated by corporate identifier nodes, and locked behind security protocols."
    },
    {
      q: language === 'id' ? "Bagaimana asisten AI membantu bisnis saya?" : "How does the AI assistant uplift operations?",
      a: language === 'id' 
        ? "Dari mengantisipasi pola penjualan akhir pekan, menganalisis fluktuasi laba bulanan, menata harga jual terlaris, hingga memantau anomali stok yang menipis secara otomatis!"
        : "By charts mapping weekend demand surges, analyzing sales margins, auto-calculating reordering times, and advising strategic pricing indexes!"
    }
  ];

  return (
    <div className="bg-[#030107] text-slate-100 font-sans min-h-screen text-base selection:bg-cyan-500/30 overflow-x-hidden relative">
      
      {/* ================================================= */}
      {/* 1. IMMERSIVE FIXED BACKGROUND STYLES & FLUIDS      */}
      {/* ================================================= */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden select-none pointer-events-none">
        
        {/* Radical Dark Cyber Mesh background gradations */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#030107] via-[#090514] to-[#04010a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,_#16082e_0%,_transparent_60%)] opacity-85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,_#09132d_0%,_transparent_65%)] opacity-75" />

        {/* Dynamic Holographic Spline Interactive Viewer Canvas Embedding */}
        <div className="absolute inset-0 w-full h-full transition-opacity duration-1000">
          {React.createElement('spline-viewer', {
            url: "https://prod.spline.design/615b9422-9985-43f6-8593-d7d7bc3b0be1/scene.splinecode",
            style: { width: '100%', height: '100%', display: 'block', transform: `translateY(${scrollY * 0.15}px)` },
            class: "w-full h-full"
          })}
        </div>

        {/* Ambient Overlay to integrate Spline 3D Scene beautifully into UX theme */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030107]/45 to-[#030107] w-full h-full" />

        {/* Extra glowing purple effects & custom floating neon particles */}
        <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] rounded-full bg-violet-600/10 blur-[130px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />

        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            animate={{
              x: [0, p.speedX * 180, 0],
              y: [0, p.speedY * 260, 0],
              opacity: [0.15, 0.75, 0.15]
            }}
            transition={{
              duration: Math.random() * 12 + 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              filter: `blur(${p.size < 5 ? '1px' : '2px'})`,
            }}
          />
        ))}
      </div>

      {/* ================================================= */}
      {/* 2. HEADER NAVBAR                                   */}
      {/* ================================================= */}
      <nav className="relative z-50 w-full px-6 md:px-12 h-20 flex justify-between items-center bg-transparent border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Neon interactive icon badge */}
          <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-[0_0_15px_rgba(139,92,246,0.6)] cursor-pointer hover:rotate-6 hover:scale-105 transition-all">
            M
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-cyan-200">
              InMarket.id
            </span>
            <div className="text-[7.5px] tracking-[0.3em] font-mono text-cyan-400 font-extrabold uppercase leading-none">Smart AI Hub 2026</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeLanguageSwitcher />
          
          <button 
            onClick={() => { playClickSound(); onNavigate('auth'); }}
            className="hidden sm:flex px-4.5 py-2.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/20 rounded-full font-bold text-xs tracking-wider transition-all cursor-pointer uppercase"
          >
            {t('navLogin')}
          </button>

          <button 
            onClick={handleDemoGuestLogin}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white rounded-full text-xs font-bold hover:shadow-[0_0_20px_rgba(34,211,238,0.5)] transition-all flex items-center gap-1.5 border border-violet-400/20 cursor-pointer uppercase"
          >
            <span>{t('navDemo')}</span> <ArrowRight size={13} className="animate-pulse" />
          </button>
        </div>
      </nav>

      {/* ================================================= */}
      {/* 3. HERO OPENING VIEW (100vh Landing Canopy)       */}
      {/* ================================================= */}
      <section className="relative z-20 min-h-[calc(100vh-80px)] flex flex-col justify-center items-center px-6 text-center overflow-hidden">
        
        {/* Soft parallax container translates down as scroll departs */}
        <motion.div
          style={{
            transform: `translateY(${scrollY * 0.28}px)`,
            opacity: Math.max(0, 1 - scrollY / 550)
          }}
          className="max-w-4xl mx-auto space-y-6 relative transition-all"
        >
          {/* Cybernetic Pill Label */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-xs text-violet-300 tracking-[0.2em] font-mono uppercase font-bold animate-pulse">
            <Sparkles size={13} className="text-cyan-400" /> {language === 'id' ? 'PLATFORM LEDGER HOLOGRAFIK' : 'DEEP HOLOGRAPHIC LEDGER PLATFORM'}
          </div>

          {/* Epic Main Headline with floating neon text animations */}
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none select-none relative py-1 drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200">
              InMarket
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300">
              .id
            </span>
          </h1>

          {/* Smooth custom typing layout wrapper */}
          <div className="h-8 md:h-12 flex items-center justify-center">
            <p className="text-lg md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-200 to-violet-300 tracking-wide font-mono">
              {typedTagline}
              <span className="inline-block w-1.5 h-5 ml-1 bg-cyan-400 animate-pulse" />
            </p>
          </div>

          {/* Subtext description */}
          <p className="text-sm md:text-lg text-slate-300/80 max-w-2xl mx-auto leading-relaxed font-sans">
            {t('landingHeroSub')}
          </p>

          {/* Glassmorphic Glowing Button cluster */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 max-w-md mx-auto sm:max-w-none">
            <button
              onClick={() => { playSuccessSound(); onNavigate('auth'); }}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 rounded-2xl font-bold text-xs text-white uppercase tracking-wider hover:scale-[1.03] transition-all duration-300 relative group overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.25)] hover:shadow-[0_0_35px_rgba(139,92,246,0.55)] cursor-pointer"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">{language === 'id' ? 'Mulai Sekarang' : 'Start Now'} <ArrowRight size={14} /></span>
              <div className="absolute inset-0 bg-white/10 hover:opacity-100 opacity-0 transition-opacity" />
              <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
            </button>

            <button
              onClick={() => { playClickSound(); onNavigate('auth'); }}
              className="w-full sm:w-auto px-8 py-4 bg-[#ffffff]/5 hover:bg-[#ffffff]/10 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border border-white/10 backdrop-blur-xl hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] cursor-pointer"
            >
              {t('loginTitle')}
            </button>

            <button
              onClick={handleDemoGuestLogin}
              className="w-full sm:w-auto px-8 py-4 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 text-cyan-300 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all border border-cyan-400/40 backdrop-blur-xl hover:shadow-[0_0_25px_rgba(34,211,238,0.45)] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Tv size={14} className="shrink-0 animate-pulse" />
              <span>{t('navDemo')}</span>
            </button>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleTestChime}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-mono tracking-widest text-[#a855f7] dark:text-cyan-400 cursor-pointer transition-all uppercase"
            >
              {t('testChime')}
            </button>
          </div>
        </motion.div>


      </section>

      {/* ================================================= */}
      {/* 4. DOCKING FLOATING DASHBOARD PREVIEW              */}
      {/* ================================================= */}
      <section className="relative z-30 px-6 max-w-6xl mx-auto py-12" id="workspace_preview">
        <motion.div
          initial={{ opacity: 0, y: 75, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.95, ease: 'easeOut' }}
          className="relative rounded-3xl overflow-hidden border border-violet-500/20 shadow-2xl p-6 md:p-10 backdrop-blur-3xl bg-slate-950/70 shadow-[0_0_50px_rgba(139,92,246,0.15)]"
        >
          {/* Neon Scanner Line running vertical */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee] pointer-events-none animate-pulse" />

          {/* Top terminal HUD strip */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-white/5 pb-5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="h-4 w-[1px] bg-white/10 mx-2" />
              <span className="font-mono text-xs opacity-75 text-cyan-400 text-left">LEDGER://INMARKET_QUANTUM_ANALYTICS_2026</span>
            </div>
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] text-emerald-400 font-mono font-bold animate-pulse">
                ● {t('activeSaas')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales ledger chart simulation */}
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 rounded-2xl bg-black/40 border border-white/5 p-5 relative">
                <p className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 mb-3 font-mono">{t('salesVelocity')}</p>
                <div className="h-[80%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveChartData}>
                      <XAxis dataKey="name" stroke="#a78bfa" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#a78bfa" fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0c071a', border: '1px solid #c084fc', borderRadius: '12px', color: '#fff' }} />
                      <Line type="monotone" dataKey="sales" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#22d3ee', strokeWidth: 0, r: 4 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-[#0e0722]/50 border border-white/5 relative group hover:border-[#a855f7]/30 transition-all">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">{t('aiForecast')}</h4>
                  <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">+45.2% YoY</p>
                  <p className="text-[10px] opacity-50 font-mono mt-1">{language === 'id' ? 'Disimulasikan dengan Proyeksi Deep Neural' : 'Simulated with Deep Neural Projections'}</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0e0722]/50 border border-white/5 relative group hover:border-[#a855f7]/30 transition-all">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 font-mono">{t('attendanceLogs')}</h4>
                  <p className="text-2xl font-black text-emerald-400">99.8% {t('efficiency')}</p>
                  <p className="text-[10px] opacity-50 font-mono mt-1">{language === 'id' ? 'Koordinat Wajah Aman Terverifikasi' : 'Secure Facial Coordinates Match OK'}</p>
                </div>
              </div>
            </div>

            {/* Embedded Interactive Ledger HUD */}
            <div className="p-6 bg-gradient-to-br from-[#10062a]/90 to-[#070311]/90 border border-[#a855f7]/30 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-indigo-500/10 rounded-full blur-3xl" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#a855f7]/20 border border-[#a855f7]/30 flex items-center justify-center font-bold text-xs text-violet-300">
                    AI
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold font-mono tracking-wider">{language === 'id' ? 'InMarket.id Bot AI' : 'InMarket.id AI Bot'}</h5>
                    <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">{language === 'id' ? 'ALGORITMA PREDIKTIF AKTIF' : 'PREDICTIVE ALGORITHMS ACTIVE'}</p>
                  </div>
                </div>

                <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-2">
                  <p className="text-xs leading-relaxed italic text-indigo-200">
                    {language === 'id' 
                      ? "“Sistem merekam peningkatan 14% loyalitas pelanggan. AI menyarankan peluncuran kupon diskon akhir pekan untuk memaksimalkan arus kas masuk Anda.”"
                      : "“System captures 14% lift in active customer returns. AI maps suggestion vectors to release weekend campaign coupons to optimize liquid assets.”"}
                  </p>
                </div>
              </div>

              <div className="bg-[#a855f7]/10 p-3 rounded-xl flex items-center justify-between text-[11px] font-bold mt-4 border border-[#a855f7]/20">
                <span className="text-indigo-200">✨ {language === 'id' ? 'Rekomendasi Stok Siap' : 'Stock Recommendation Ready'}</span>
                <Compass size={14} className="text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
             </div>
            </div>
        </motion.div>
      </section>

      {/* ================================================= */}
      {/* 5. LIVE ECOSYSTEM GROWTH MATRIX STATS              */}
      {/* ================================================= */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="relative rounded-[36px] bg-gradient-to-b from-indigo-950/15 via-[#0e0722]/10 to-[#030107]/20 border border-white/5 p-8 md:p-12 backdrop-blur-2xl">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h3 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-cyan-200">
              {t('landingMetricsTitle')}
            </h3>
            <p className="text-sm md:text-base opacity-70">
              {language === 'id' ? 'Ribuan transaksi dan pelaku UMKM modern terintegrasi dalam jejaring bisnis berbasis AI 2026.' : 'Thousands of transactions and modern MSME players integrated in AI-powered business networks 2026.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 text-center bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl hover:border-violet-500/25 transition-all">
              <div className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 mb-3 font-mono">
                {metricCounts.transactions.toLocaleString()}+
              </div>
              <p className="text-xs uppercase tracking-widest font-bold opacity-60">{language === 'id' ? 'Transaksi Diproses Detik Ini' : 'Transactions Processed This Second'}</p>
            </div>
            
            <div className="p-8 text-center bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl hover:border-violet-500/25 transition-all">
              <div className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400 mb-3 font-mono">
                {metricCounts.businesses}+
              </div>
              <p className="text-xs uppercase tracking-widest font-bold opacity-60">{language === 'id' ? 'Gerai Bisnis UMKM Aktif 2026' : 'Active MSME Business Outlets 2026'}</p>
            </div>
            
            <div className="p-8 text-center bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl hover:border-violet-500/25 transition-all">
              <div className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 mb-3 font-mono">
                {metricCounts.satisfaction}%
              </div>
              <p className="text-xs uppercase tracking-widest font-bold opacity-60">{language === 'id' ? 'Indeks Kepuasan Pengguna' : 'User Satisfaction Index'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* 6. DYNAMIC CORPORATE MOTIVATOR TICKER              */}
      {/* ================================================= */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="rounded-3xl border border-white/5 p-8 text-center bg-gradient-to-r from-violet-950/15 via-[#180d3b]/10 to-teal-950/15 relative overflow-hidden backdrop-blur-xl">
          <MessageSquareQuote size={32} className="mx-auto text-violet-400 opacity-60 mb-4 animate-bounce" />
          <h4 className="text-[10px] font-mono tracking-[0.3em] font-extrabold text-[#a855f7] dark:text-cyan-400 uppercase mb-3">AI PROVERBAL MESSAGE</h4>
          <p className="text-base md:text-xl font-medium tracking-tight leading-relaxed italic text-indigo-100 max-w-2xl mx-auto">
            {language === 'id'
              ? "“Bisnis modern tidak hanya mencatat uang keluar masuk secara konvensional, tapi mengaktifkan prediksi cerdas untuk menguasai masa depan.”"
              : "“A modern venture does not merely sum standard ledgers, but equips self-correcting forecast engines to capture tomorrow.”"
            }
          </p>
        </div>
      </section>

      {/* ================================================= */}
      {/* 7. PREMIUM BENTO SPECIFICATIONS                    */}
      {/* ================================================= */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-30">
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-violet-200">
            {t('landingFeaturesTitle')}
          </h2>
          <p className="text-xs font-mono tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase font-extrabold">PRESET MATRIX SAAS SPECIFICATION</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: LayoutDashboard, title: t('dashboard'), desc: language === 'id' ? "Sistem grafik real-time 2026 yang menyajikan tren laba-rugi, neraca pemasukan, dan pos pengeluaran dalam satu pandangan data." : "Real-time 2026 chart system presenting profit-loss trends, revenue balance, and expense categories in one data view." },
            { icon: Package, title: t('inventory'), desc: language === 'id' ? "Dilengkapi status stok berwarna merah, kuning, dan hijau. Dukungan upload foto produk ganda plus import bulk file CSV instan." : "Equipped with red, yellow, and green stock status. Supports dual product photo uploads plus instant bulk CSV file import." },
            { icon: Users, title: t('absensi'), desc: language === 'id' ? "Owner men-generate kode acak harian. Karyawan menginput kode dan mengupload foto masuk kerja bersertifikat biometrik." : "Owners generate daily random codes. Employees input the code and upload biometric-certified work-entry photos." },
            { icon: BarChart3, title: t('kasir'), desc: language === 'id' ? "Mendukung transaksi Cash, QRIS statis 2026, transfer bank, dan E-Wallet serta mencetak invoice digital dengan sound beeps." : "Supports Cash, static 2026 QRIS, bank transfer, and E-Wallet transactions and prints digital invoices with sound beeps." },
            { icon: Zap, title: t('aiAssistant'), desc: language === 'id' ? "Layanan asisten otomatis yang menjawab chat bisnis, membuat anjuran strategi harga, prediksi pengeluaran, dan tips draf." : "Automated assistant service answering business chats, creating price strategy suggestions, expense predictions, and draft tips." },
            { icon: ShieldCheck, title: t('landingSecTitle'), desc: language === 'id' ? "Seluruh basis data multi-toko terlindung di cloud, terisolasi sempurna pada ID otorisasi lokal agar mencegah kebocoran data." : "Entire multi-store database protected in the cloud, perfectly isolated on local authorization IDs to prevent data leaks." }
          ].map((f, i) => (
            <div key={i} className="p-8 bg-neutral-950/40 border border-white/5 rounded-3xl hover:border-violet-500/50 transition-all duration-300 group hover:-translate-y-1.5 shadow-lg relative overflow-hidden backdrop-blur-md">
              <div className="p-3 bg-violet-600/10 rounded-xl inline-block text-violet-400 mb-6 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all">
                <f.icon size={24} />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">{f.title}</h3>
              <p className="opacity-70 text-xs md:text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================= */}
      {/* 8. PRICING TIER ROADMAP PLANS                     */}
      {/* ================================================= */}
      <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <h3 className="text-3xl md:text-4xl font-black text-center mb-16 tracking-tight text-white">{t('pricingTitle')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-8 rounded-3xl border border-white/5 bg-neutral-950/20 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase">STARTER CORE</span>
              <h4 className="text-3xl font-extrabold mt-2 text-white">Rp 0 <span className="text-xs font-normal opacity-50">/ {language === 'id' ? 'selamanya' : 'forever'}</span></h4>
              <p className="text-xs text-slate-400 mt-2">{language === 'id' ? 'Sistem dasar untuk UMKM rintisan baru pelopor lokal.' : 'Basic system for new local pioneer MSME startups.'}</p>
              <ul className="space-y-3.5 text-xs font-medium mt-8 border-t border-white/5 pt-6 opacity-85">
                <li>✓ {language === 'id' ? 'Max 50 Item Produk Terbatas' : 'Max 50 Limited Product Items'}</li>
                <li>✓ {language === 'id' ? '1 Akun Operator Karyawan' : '1 Employee Operator Account'}</li>
                <li>✓ {language === 'id' ? 'Dashboard Kasir & Arus Kas' : 'Main POS & Cashflow Dashboard'}</li>
                <li className="opacity-30">✗ {language === 'id' ? 'Rekomendasi Algoritma AI Pintar' : 'Smart AI Algorithm Recommendations'}</li>
              </ul>
            </div>
            <button onClick={() => onNavigate('auth')} className="w-full mt-8 py-4 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 uppercase tracking-widest cursor-pointer">
              {language === 'id' ? "Daftar Gratis" : "Get Free Access"}
            </button>
          </div>

          <div className="p-8 rounded-3xl border-2 border-violet-500/60 bg-[#16062f]/30 backdrop-blur-md flex flex-col justify-between relative shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <div className="absolute -top-4 right-6 px-3 py-1 rounded-full bg-violet-600 text-[10px] font-extrabold text-white uppercase tracking-widest animate-pulse font-mono">PRO RECOMENDED</div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-violet-400 uppercase">PROFESSIONAL SAAS</span>
              <h4 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-300 mt-2">Rp 199.000 <span className="text-xs font-normal text-slate-300">/ {language === 'id' ? 'bln' : 'mo'}</span></h4>
              <p className="text-xs text-indigo-200 mt-2 font-semibold">{language === 'id' ? 'Senjata tempur utama UMKM berkembang pesat.' : 'Primary toolset for rapidly growing MSMEs.'}</p>
              <ul className="space-y-3.5 text-xs font-medium mt-8 border-t border-[#a855f7]/20 pt-6">
                <li>✓ {language === 'id' ? 'Katalog Produk Tanpa Batas (Unlimited)' : 'Unlimited Product Catalog'}</li>
                <li>✓ {language === 'id' ? 'Hingga 15 Akun Absensi Karyawan' : 'Up to 15 Employee Attendance Accounts'}</li>
                <li>✓ {language === 'id' ? 'Laporan Gaji & Slip Foto Selfie' : 'Payroll Reports & Selfie Slips'}</li>
                <li>✓ {language === 'id' ? 'Asisten AI Prediksi Stok & Laba' : 'AI Stock & Profit Prediction Assistant'}</li>
              </ul>
            </div>
            <button onClick={() => onNavigate('auth')} className="w-full mt-8 py-4 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md hover:shadow-lg hover:shadow-violet-500/20 transition-all uppercase tracking-widest cursor-pointer">
              {t('paySalary')}
            </button>
          </div>

          <div className="p-8 rounded-3xl border border-white/5 bg-neutral-950/20 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase">ENTERPRISE CORE</span>
              <h4 className="text-3xl font-extrabold mt-2 text-white">Rp 499.000 <span className="text-xs font-normal opacity-50">/ {language === 'id' ? 'bln' : 'mo'}</span></h4>
              <p className="text-xs text-slate-400 mt-2">{language === 'id' ? 'Jejaring multi-toko waralaba dan lisensi korporat global.' : 'Multi-outlet franchises and global corporate licenses.'}</p>
              <ul className="space-y-3.5 text-xs font-medium mt-8 border-t border-white/5 pt-6 opacity-85">
                <li>✓ {language === 'id' ? 'Semua Fitur Pro Tanpa Batas' : 'All Pro Features Unlimited'}</li>
                <li>✓ {language === 'id' ? 'Akun Staff & Operator Karyawan Infinite' : 'Infinite Staff & Operator Accounts'}</li>
                <li>✓ {language === 'id' ? 'Integrasi API & Barcode Scanner' : 'API Integration & Barcode Scanner'}</li>
                <li>✓ {language === 'id' ? 'Customer SLA Premium Prioritas 24/7' : '24/7 Priority Premium Customer SLA'}</li>
              </ul>
            </div>
            <button onClick={() => onNavigate('auth')} className="w-full mt-8 py-4 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10 uppercase tracking-widest cursor-pointer">
              {language === 'id' ? "Hubungi Sales" : "Contact Sales"}
            </button>
          </div>

        </div>
      </section>

      {/* ================================================= */}
      {/* 9. MILITARY SECURITY CLOUD AUDITS                  */}
      {/* ================================================= */}
      <section className="py-24 px-6 max-w-4xl mx-auto text-center border-t border-white/5">
        <div className="space-y-6">
          <div className="p-3 bg-cyan-600/10 rounded-full inline-block text-cyan-400 border border-cyan-400/25">
            <Lock size={32} className="animate-pulse" />
          </div>
          <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">{t('landingSecTitle')}</h3>
          <p className="opacity-70 text-xs md:text-sm leading-relaxed max-w-2xl mx-auto">
            {language === 'id' 
              ? 'Seluruh ledger keuangan, detail sandi pengguna, serta katalog foto usaha dilindungi oleh enkripsi cloud modern. Transaksi dibatasi sesuai izin ketat Sandbox guna menjamin kenyamanan bebas dari kebocoran data.'
              : 'Entire financial ledgers, user credentials, and business photo catalogs are protected by modern cloud encryption. Transactions are scoped within strict Sandbox permissions to guarantee data breach prevention.'}
          </p>
        </div>
      </section>

      {/* ================================================= */}
      {/* 10. FAQ ACCORDION STRUCTURE                       */}
      {/* ================================================= */}
      <section className="py-24 px-6 max-w-4xl mx-auto border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h3 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <HelpCircle className="text-cyan-400 shrink-0" size={28} /> {t('landingFaqTitle')}
          </h3>
          <p className="text-xs font-mono tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase font-extrabold">ECOSYSTEM CLARITY FAQ</p>
        </div>

        <div className="space-y-4">
          {faqs.map((f, idx) => (
            <div 
              key={idx} 
              className="p-5 rounded-2xl border border-white/5 bg-neutral-950/20 backdrop-blur-sm overflow-hidden transition-all duration-300"
            >
              <button 
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} 
                className="w-full flex justify-between items-center text-left font-bold text-sm md:text-base cursor-pointer"
              >
                <span className="text-white hover:text-cyan-300 transition-colors">{f.q}</span>
                <ChevronDown size={18} className={`opacity-60 transition-transform ${activeFaq === idx ? 'rotate-180 text-violet-450' : ''}`} />
              </button>
              
              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="text-xs md:text-sm opacity-75 leading-relaxed border-t border-white/5 pt-4 text-slate-350"
                  >
                    {f.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================= */}
      {/* 11. WORLDWIDE STARTUP CORPORATE FOOTER             */}
      {/* ================================================= */}
      <footer className="py-20 px-6 md:px-12 border-t border-white/5 bg-black/60 relative z-30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-sm text-white">M</div>
              <span className="text-xl font-bold">InMarket</span>
            </div>
            <p className="text-xs opacity-50 leading-relaxed">
              {language === 'id' 
                ? 'Sistem SaaS FinTech cerdas era 2026 yang mentransformasi ekosistem keuangan gerai dagang dan waralaba UMKM lokal.'
                : 'Smart 2026 FinTech SaaS system transforming the financial ecosystem of local MSME outlets and franchises.'}
            </p>
          </div>
          <div>
            <h5 className="font-extrabold text-[10px] tracking-widest uppercase opacity-40 mb-4 font-mono">{language === 'id' ? 'SPESIFIKASI PRODUK' : 'PRODUCT SPEC'}</h5>
            <ul className="space-y-2.5 text-xs opacity-70">
              <li className="hover:text-cyan-400 cursor-pointer">{language === 'id' ? 'POS Kasir Realtime' : 'Realtime Cashier POS'}</li>
              <li className="hover:text-cyan-400 cursor-pointer">{language === 'id' ? 'Ledger Prediktif AI' : 'AI Predictive Ledger'}</li>
              <li className="hover:text-cyan-400 cursor-pointer">{language === 'id' ? 'API Absensi Selfie' : 'Selfie Attendance API'}</li>
            </ul>
          </div>
          <div>
            <h5 className="font-extrabold text-[10px] tracking-widest uppercase opacity-40 mb-4 font-mono">{language === 'id' ? 'REGULASI' : 'REGULATIONS'}</h5>
            <ul className="space-y-2.5 text-xs opacity-70">
              <li className="hover:text-cyan-400 cursor-pointer">Terms of Ledger Agreements</li>
              <li className="hover:text-cyan-400 cursor-pointer">Privacy Sandbox Regulations</li>
              <li className="hover:text-cyan-400 cursor-pointer">Platform Security Cert 2026</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h5 className="font-extrabold text-[10px] tracking-widest uppercase opacity-40 font-mono font-sans">{language === 'id' ? 'INTEGRATOR DUKUNGAN' : 'SUPPORT INTEGRATOR'}</h5>
            <div className="flex gap-4 text-xs">
              <div className="hover:text-violet-500 cursor-pointer p-2 bg-white/5 rounded-full hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all">
                <Instagram size={16} />
              </div>
              <div className="hover:text-violet-500 cursor-pointer p-2 bg-white/5 rounded-full hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all">
                <MessageCircle size={16} />
              </div>
            </div>
            <p className="text-[10px] opacity-40 font-mono">SECURE MAIL: support@inmarket.id</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col lg:flex-row justify-between items-center gap-6 text-xs font-mono">
          <div className="space-y-1 opacity-55 max-w-xl text-center lg:text-left">
            <p>© 2026 InMarket.id Platform. {language === 'id' ? 'Beroperasi aman di kluster AI-SaaS. Dibangun untuk performa UMKM global premium.' : 'Securely operating in AI-SaaS cluster. Built for premium global MSME performance.'}</p>
            <div className="flex justify-center lg:justify-start gap-4 text-[9px] opacity-75">
              <span>HOLOGRAPHIC PURPLE CONFIG v2.8</span>
              <span>DEPLOY: STABLE_CLOUD_RUN</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0d0725]/50 border border-[#a855f7]/20 p-2.5 rounded-2xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-violet-600/40 via-cyan-400/30 to-transparent" />
            <div className="flex items-center gap-2 pl-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span className="text-[9px] font-mono font-black tracking-widest text-violet-400 dark:text-cyan-400 uppercase leading-none">
                {language === 'id' ? 'LOKALISASI : ' : 'LOCALE : '}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setLanguage('id');
                  playSuccessSound();
                }}
                className={`py-1.5 px-3 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase cursor-pointer flex items-center justify-center gap-1 border leading-none ${
                  language === 'id'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                    : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <span>🇮🇩</span>
                <span>BAHASA</span>
              </button>
              
              <button
                onClick={() => {
                  setLanguage('en');
                  playSuccessSound();
                }}
                className={`py-1.5 px-3 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase cursor-pointer flex items-center justify-center gap-1 border leading-none ${
                  language === 'en'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                    : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <span>🇬🇧</span>
                <span>ENGLISH</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ================================================= */}
      {/* 12. FLOATING HOLOGRAM AI ASSISTANT POPUP         */}
      {/* ================================================= */}
      <div className="fixed bottom-6 right-6 z-50 font-sans pointer-events-auto">
        <AnimatePresence>
          {aiOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-80 md:w-96 rounded-2xl bg-slate-950/90 border border-violet-500/30 p-5 shadow-2xl mb-4 text-left relative overflow-hidden backdrop-blur-2xl"
              style={{
                boxShadow: '0 0 35px rgba(139,92,246,0.25), inset 0 0 15px rgba(139,92,246,0.1)'
              }}
            >
              {/* Sci-fi scanner lights */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-violet-400" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-violet-400" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400" />

              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 border border-cyan-400/35 relative">
                      <Bot size={16} className="animate-pulse" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-black rounded-full" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">InMarket.id AI Assistant</h5>
                    <p className="text-[8px] text-cyan-400 font-mono tracking-wider font-bold">2026 COGNITIVE CHATBOT</p>
                  </div>
                </div>
                
                <button
                  onClick={() => { playClickSound(); setAiOpen(false); }}
                  className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer text-xs uppercase tracking-widest font-mono"
                >
                  ✕ CLOSE
                </button>
              </div>

              {/* Message screen */}
              <div className="my-4 h-36 overflow-y-auto pr-1 text-xs space-y-2 custom-scrollbar flex flex-col justify-end">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex gap-1.5 items-center text-[9px] font-mono text-cyan-400 font-black uppercase mb-1">
                    <span>SYSTEM AGENT</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                  {aiTyping ? (
                    <div className="flex items-center gap-1.5 py-1 text-slate-400 font-mono tracking-wider">
                      <span>Typing holographic response</span>
                      <span className="inline-block w-1.5 h-3 bg-cyan-400 animate-pulse" />
                    </div>
                  ) : (
                    <p className="leading-relaxed text-slate-100">{aiMessage}</p>
                  )}
                </div>
              </div>

              {/* Dynamic Action suggestion keys */}
              <div className="space-y-1.5">
                <p className="text-[8px] font-mono tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase font-black">ASK A QUESTION</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleAiQuestion('about')}
                    className="py-1.5 px-2.5 bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/25 rounded-lg text-[9.5px] font-bold text-violet-300 text-left transition truncate cursor-pointer"
                  >
                    💡 Apa itu InMarket?
                  </button>
                  <button
                    onClick={() => handleAiQuestion('analytics')}
                    className="py-1.5 px-2.5 bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/25 rounded-lg text-[9.5px] font-bold text-violet-300 text-left transition truncate cursor-pointer"
                  >
                    📊 Realtime Analytics?
                  </button>
                  <button
                    onClick={() => handleAiQuestion('qris')}
                    className="py-1.5 px-2.5 bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/25 rounded-lg text-[9.5px] font-bold text-violet-300 text-left transition truncate cursor-pointer"
                  >
                    💳 Sistem Kasir POS?
                  </button>
                  <button
                    onClick={() => handleAiQuestion('reco')}
                    className="py-1.5 px-2.5 bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/25 rounded-lg text-[9.5px] font-bold text-violet-300 text-left transition truncate cursor-pointer"
                  >
                    🤖 Fitur Asisten AI?
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating bubble toggle */}
        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { playClickSound(); setAiOpen(!aiOpen); }}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white relative border transition-all cursor-pointer ${
              aiOpen 
                ? 'bg-[#12082b] border-[#a855f7]/50 shadow-[0_0_20px_rgba(139,92,246,0.35)]' 
                : 'bg-gradient-to-tr from-violet-600 to-cyan-500 border-white/10 shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:shadow-[0_0_35px_rgba(34,211,238,0.7)]'
            }`}
          >
            <Bot size={24} className={aiOpen ? 'text-violet-400' : 'text-white animate-pulse'} />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-400"></span>
            </span>
          </motion.button>
        </div>
      </div>

    </div>
  );
}
