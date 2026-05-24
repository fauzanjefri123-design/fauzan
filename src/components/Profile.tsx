import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Mail, Phone, MapPin, Building2, Save, FileText, Camera, 
    X, Wallet, Trash2, ShieldAlert, LogOut, Verified, Award, Star, Zap, Crown,
    Calendar, Briefcase, Volume2, VolumeX, Music
} from 'lucide-react';
import { playClickSound, playSuccessSound } from '../lib/sounds';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { useSoundPreferences } from '../hooks/useSoundPreferences';
import { translations } from '../lib/translations';
import { toast } from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface UserProfile {
    id: string;
    displayName: string;
    username: string;
    email: string;
    phone: string;
    photoURL: string;
    role: 'owner' | 'employee' | 'demo';
    businessName: string;
    country: string;
    description: string;
    joinedDate: string;
    points: number;
    level: 'Amateur' | 'Pro Player' | 'Suhu' | 'King';
}

const AVATAR_GALLERY = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Lucky',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Grumpy',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Joy',
];

export default function Profile() {
    const { language } = useThemeLanguage();
    const { soundEnabled, ambienceEnabled, toggleSound, toggleAmbience } = useSoundPreferences();
    const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;

    // Secure, account-specific partition key helper
    const getAccountKey = (baseKey: string) => {
        let userEmail = 'default_user';
        if (auth.currentUser) {
            userEmail = auth.currentUser.email || auth.currentUser.uid;
        } else {
            const offlineUserStr = localStorage.getItem('offline_logged_in_user');
            if (offlineUserStr) {
                try {
                    const u = JSON.parse(offlineUserStr);
                    userEmail = u.email || 'offline_user';
                } catch {}
            }
        }
        const safeEmail = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
        return `${baseKey}_acc_${safeEmail}`;
    };

    const [user, setUser] = useState<UserProfile>({
        id: 'UID-2026-X',
        displayName: '',
        username: '',
        email: '',
        phone: '',
        photoURL: AVATAR_GALLERY[0],
        role: 'owner',
        businessName: '',
        country: 'Indonesia',
        description: '',
        joinedDate: '23 May 2026',
        points: 0,
        level: 'Amateur'
    });

    const [isEditing, setIsEditing] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Form inputs
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [country, setCountry] = useState('');
    const [description, setDescription] = useState('');
    const [photoURL, setPhotoURL] = useState(AVATAR_GALLERY[0]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic load profile on mount or user switch
    useEffect(() => {
        const uKey = getAccountKey('inmarket_user_profile');
        const saved = localStorage.getItem(uKey);
        
        let loadedUser: UserProfile | null = null;
        if (saved) {
            try {
                loadedUser = JSON.parse(saved);
            } catch {
                loadedUser = null;
            }
        }
        
        if (!loadedUser) {
            // Setup default profile based on logged-in credential
            const offlineUserStr = localStorage.getItem('offline_logged_in_user');
            let activeEmail = 'fauzanjefri123@gmail.com';
            let activeName = 'InMarket User';
            let activeRole: 'owner' | 'employee' = 'owner';

            if (offlineUserStr) {
                try {
                    const u = JSON.parse(offlineUserStr);
                    activeEmail = u.email || activeEmail;
                    activeName = u.name || u.displayName || u.email || activeName;
                    activeRole = (u.role === 'Employee' || u.role === 'Karyawan') ? 'employee' : 'owner';
                } catch {}
            }

            loadedUser = {
                id: `UID-${Math.floor(1000 + Math.random() * 9000)}`,
                displayName: activeName,
                username: activeEmail.split('@')[0],
                email: activeEmail,
                phone: '081234567890',
                photoURL: AVATAR_GALLERY[0],
                role: activeRole,
                businessName: activeRole === 'owner' ? 'Sari Rasa Bakery' : 'InMarket Lounge',
                country: 'Indonesia',
                description: activeRole === 'owner' ? 'Production & Retail' : 'Customer Service Node',
                joinedDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                points: loadedUser?.points || 0,
                level: (loadedUser?.points || 0) >= 15000 ? 'King' : (loadedUser?.points || 0) >= 5000 ? 'Suhu' : (loadedUser?.points || 0) >= 1000 ? 'Pro Player' : 'Amateur'
            };
        }

        setUser(loadedUser);
        
        // Populate form inputs
        setDisplayName(loadedUser.displayName);
        setUsername(loadedUser.username);
        setEmail(loadedUser.email);
        setPhone(loadedUser.phone);
        setBusinessName(loadedUser.businessName);
        setCountry(loadedUser.country);
        setDescription(loadedUser.description);
        setPhotoURL(loadedUser.photoURL);
    }, [auth.currentUser]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        playClickSound();

        const updatedUser = { 
            ...user, 
            displayName, 
            username, 
            email, 
            phone, 
            businessName, 
            country, 
            description, 
            photoURL 
        };

        setUser(updatedUser);
        
        const uKey = getAccountKey('inmarket_user_profile');
        localStorage.setItem(uKey, JSON.stringify(updatedUser));
        
        setIsEditing(false);
        playSuccessSound();
        toast.success(t('success'), {
            style: { background: '#111', color: '#fff', border: '1px solid #10b981' }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoURL(reader.result as string);
                playSuccessSound();
                toast.success(language === 'id' ? 'Foto berhasil diunggah' : 'Photo uploaded successfully');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLogout = () => {
        playClickSound();
        localStorage.removeItem('offline_logged_in_user');
        localStorage.removeItem('inmarket_current_store_id');
        signOut(auth).then(() => {
            window.location.reload();
        }).catch(() => {
            window.location.reload();
        });
    };

    const handleReset = () => {
        if (confirm(language === 'id' ? 'Apakah Anda yakin ingin mereset seluruh data sistem?' : 'Are you sure you want to reset all storage and data?')) {
            playClickSound();
            localStorage.clear();
            window.location.reload();
        }
    };

    const getRankStyles = () => {
        switch (user.level) {
            case 'King': 
              return { 
                border: 'border-yellow-400 bg-gradient-to-r from-yellow-300 via-amber-500 to-yellow-600', 
                shadow: 'shadow-[0_0_25px_rgba(234,179,8,1)] border-yellow-300', 
                ring: 'ring-4 ring-yellow-400/20',
                icon: Crown, 
                color: 'text-yellow-450 text-yellow-400 animate-pulse', 
                name: t('levelKing') || 'King' 
              };
            case 'Suhu': 
              return { 
                border: 'border-fuchsia-500 bg-gradient-to-tr from-fuchsia-500 to-indigo-500', 
                shadow: 'shadow-[0_0_20px_rgba(217,70,239,0.9)]', 
                ring: 'ring-4 ring-fuchsia-400/20',
                icon: Zap, 
                color: 'text-fuchsia-400', 
                name: t('levelSuhu') || 'Suhu' 
              };
            case 'Pro Player': 
              return { 
                border: 'border-cyan-400 bg-cyan-500', 
                shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.7)]', 
                ring: 'ring-4 ring-cyan-450/20',
                icon: Star, 
                color: 'text-cyan-400', 
                name: t('levelPro') || 'Pro Player' 
              };
            default: 
              return { 
                border: 'border-slate-300', 
                shadow: 'shadow-[0_0_10px_rgba(148,163,184,0.3)]', 
                ring: 'ring-2 ring-slate-400/10',
                icon: Award, 
                color: 'text-slate-400', 
                name: t('levelAmateur') || 'Amateur' 
              };
        }
    };

    // Calculate EXP thresholds
    const getNextLevelThreshold = () => {
        if (user.points >= 15000) return { current: user.points, max: 15000, next: 'MAX_TIER' };
        if (user.points >= 5000) return { current: user.points - 5000, max: 10000, next: 'King' };
        if (user.points >= 1000) return { current: user.points - 1000, max: 4000, next: 'Suhu' };
        return { current: user.points, max: 1000, next: 'Pro Player' };
    };

    const exp = getNextLevelThreshold();
    const rank = getRankStyles();

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Profile Card Left */}
                <div className="lg:w-1/3 space-y-6">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative p-8 rounded-[3rem] bg-[#090615] border border-white/10 shadow-2xl text-center group overflow-hidden"
                    >
                        {/* Radial background glow corresponding to active tier */}
                        <div className={`absolute -top-24 -left-12 w-64 h-64 opacity-25 blur-[100px] rounded-full transition-colors ${user.level === 'King' ? 'bg-yellow-500' : user.level === 'Suhu' ? 'bg-fuchsia-600' : user.level === 'Pro Player' ? 'bg-cyan-500' : 'bg-slate-500'}`} />

                        <div className="relative z-10 flex flex-col items-center">
                            {/* Glow frames avatar box */}
                            <div className="relative mb-6">
                                <motion.div 
                                    animate={user.level === 'King' || user.level === 'Suhu' ? { rotate: 360 } : {}} 
                                    transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                                    className={`absolute inset-[-12px] border border-dashed rounded-full opacity-40 ${user.level === 'King' ? 'border-yellow-400' : user.level === 'Suhu' ? 'border-fuchsia-400' : user.level === 'Pro Player' ? 'border-cyan-400' : 'border-slate-400'}`} 
                                />
                                <div className={`relative w-40 h-40 rounded-full p-1.5 bg-gradient-to-tr from-white/10 to-transparent ${rank.shadow} ${rank.ring} border-2 border-white/10 overflow-hidden`}>
                                    <img src={photoURL} alt="Avatar" className="w-full h-full object-cover rounded-full bg-slate-900" referrerPolicy="no-referrer" />
                                    <button 
                                        type="button"
                                        onClick={() => { playClickSound(); setIsGalleryOpen(true); }}
                                        className="absolute bottom-1 right-1 p-3 bg-emerald-500 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition cursor-pointer"
                                        title="Pick Avatar"
                                    >
                                        <Camera size={18} />
                                    </button>
                                </div>
                                <div className={`absolute -top-2 -right-2 p-2 rounded-full border shadow-lg ${user.level === 'King' ? 'border-yellow-400 bg-yellow-500/20' : user.level === 'Suhu' ? 'border-fuchsia-400 bg-fuchsia-500/20' : user.level === 'Pro Player' ? 'border-cyan-400 bg-cyan-500/20' : 'border-slate-500 bg-slate-500/20'}`}>
                                    <rank.icon className={rank.color} size={22} />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black tracking-tight text-white">{user.displayName || 'Complete Profile'}</h2>
                            <p className="text-xs font-mono text-slate-400 mt-1 uppercase tracking-widest">@{user.username || 'unconfigured'}</p>
                            
                            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                                <span className="px-4 py-1.5 bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase rounded-full tracking-[0.15em]">
                                    {user.role === 'owner' ? t('ownerRole') : t('employeeRole')}
                                </span>
                                <span className={`px-4 py-1.5 bg-white/5 border text-[10px] font-black uppercase rounded-full tracking-[0.15em] flex items-center gap-2 ${user.level === 'King' ? 'border-yellow-400 text-yellow-400' : user.level === 'Suhu' ? 'border-fuchsia-500 text-fuchsia-400' : user.level === 'Pro Player' ? 'border-cyan-400 text-cyan-400' : 'border-slate-400 text-slate-400'}`}>
                                    {rank.name}
                                </span>
                            </div>

                            {/* Achievements points progress bar */}
                            <div className="w-full mt-6 text-left">
                                <div className="flex justify-between text-[9px] font-black text-slate-400 mb-1.5">
                                    <span>{language === 'id' ? 'PROGRESS LEVEL' : 'LEVEL MILESTONE'}</span>
                                    <span>{user.points.toLocaleString()} XP / {exp.next === 'MAX_TIER' ? 'MAX' : `${(exp.current + exp.max).toLocaleString()} XP`}</span>
                                </div>
                                <div className="w-full h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full bg-gradient-to-r ${user.level === 'King' ? 'from-yellow-400 to-amber-500' : user.level === 'Suhu' ? 'from-fuchsia-500 to-indigo-500' : user.level === 'Pro Player' ? 'from-cyan-400 to-blue-500' : 'from-slate-400 to-slate-500'}`}
                                      style={{ width: exp.next === 'MAX_TIER' ? '100%' : `${(exp.current / exp.max) * 100}%` }}
                                    />
                                </div>
                                {exp.next !== 'MAX_TIER' && (
                                  <span className="text-[8px] font-bold text-slate-500 block mt-1 uppercase tracking-wide">
                                    {language === 'id' ? `Tambahkan ${exp.max - exp.current} XP (dari absensi/top-up) ke ${exp.next}` : `Need ${exp.max - exp.current} XP to reach ${exp.next} level`}
                                  </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full mt-8 pt-6 border-t border-white/5">
                                <div className="text-center">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{language === 'id' ? 'TOTAL AKUN POIN' : 'ACCOUNT EXP'}</span>
                                    <div className="text-base font-black text-emerald-400 flex items-center justify-center gap-1.5 font-mono">
                                        <Zap size={16} /> {user.points.toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('joinedDate')}</span>
                                    <div className="text-xs font-black text-white flex items-center justify-center gap-1.5">
                                        <Calendar size={14} className="text-slate-400" /> {user.joinedDate}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="p-6 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 text-white shadow-xl flex items-center justify-between group overflow-hidden relative">
                        <div className="relative z-10">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 block mb-1">Network Node Status</span>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_#34d399]" />
                                <span className="text-sm font-black tracking-wide text-white">{t('online')}</span>
                            </div>
                        </div>
                        <Verified size={32} className="text-emerald-400 relative z-10" />
                    </div>
                </div>

                {/* Info and Edit Form */}
                <div className="lg:w-2/3 space-y-8">
                    <div className="p-8 rounded-[3rem] bg-[#090615] border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                        
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-base font-black uppercase tracking-widest flex items-center gap-2 text-white">
                                <Briefcase size={22} className="text-indigo-400" /> {language === 'id' ? 'Kredensial Profil Akun' : 'User Account Profile'}
                            </h3>
                            <button 
                                type="button"
                                onClick={() => { playClickSound(); setIsEditing(!isEditing); }}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                                    isEditing ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'
                                }`}
                            >
                                {isEditing ? t('cancel') : language === 'id' ? 'Ubah Profil' : 'Edit Profile'}
                            </button>
                        </div>

                        {/* Empty States condition checking */}
                        {(!displayName && !username) ? (
                          <div className="py-12 text-center text-slate-500">
                             <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                             <p className="text-xs font-bold uppercase tracking-widest">{t('emptyProfile') || 'Lengkapi profil Anda'}</p>
                          </div>
                        ) : null}

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">{t('fullName')}</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                                        <input 
                                            disabled={!isEditing}
                                            value={displayName}
                                            required
                                            onChange={e => setDisplayName(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 disabled:opacity-40 transition-all text-sm font-bold text-white shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Username</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg group-focus-within:text-emerald-400 transition-colors">@</div>
                                        <input 
                                            disabled={!isEditing}
                                            value={username}
                                            required
                                            onChange={e => setUsername(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 disabled:opacity-40 transition-all text-sm font-bold text-white shadow-inner"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                                        <input 
                                            disabled={true}
                                            value={email}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 opacity-40 transition-all text-sm font-bold text-slate-400 font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">{language === 'id' ? 'NOMOR HP' : 'PHONE NUMBER'}</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                                        <input 
                                            disabled={!isEditing}
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 disabled:opacity-40 transition-all text-sm font-bold text-white shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 mt-8 pt-8 border-t border-white/5">
                                <h4 className="text-xs font-black uppercase text-indigo-400 flex items-center gap-2">
                                    <Building2 size={16} /> {translations[language]?.businessTitle || 'Data Bisnis & Usaha'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">{t('businessName')}</label>
                                        <input 
                                            disabled={!isEditing}
                                            value={businessName}
                                            onChange={e => setBusinessName(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 disabled:opacity-40 transition-all text-sm font-bold text-white shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">{t('country')}</label>
                                        <input 
                                            disabled={!isEditing}
                                            value={country}
                                            onChange={e => setCountry(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 disabled:opacity-40 transition-all text-sm font-bold text-white shadow-inner"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">{language === 'id' ? 'JENIS USAHA / BIO' : 'VENTURE SECTOR / BIO'}</label>
                                        <textarea 
                                            disabled={!isEditing}
                                            value={description || ''}
                                            onChange={e => setDescription(e.target.value)}
                                            rows={3}
                                            placeholder={language === 'id' ? "Sektor usaha atau deskripsi pendek" : "Short sector description / tagline"}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 disabled:opacity-40 transition-all text-sm font-bold text-white shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            {isEditing && (
                                <motion.button 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    type="submit"
                                    className="w-full py-4 mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                                >
                                    <Save size={16} className="inline mr-2" /> {translations[language]?.saveChanges || 'Simpan Perubahan'}
                                </motion.button>
                            )}
                        </form>
                    </div>

                    {/* HOLOGRAPHIC SOUND & MUSIC PREFERENCES PANEL */}
                    <div className="p-8 rounded-[2.5rem] bg-[#0c0822]/80 backdrop-blur-xl border border-violet-500/20 shadow-2xl relative overflow-hidden mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-violet-600/15 text-violet-400 rounded-2xl">
                                    <Volume2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-violet-400">{language === 'id' ? 'INTEGRASI HAPTIC & SUARA' : 'SYSTEM SOUND CONTROLS'}</h3>
                                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">Customize real-time active audio feedback channels</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/5 pt-6">
                            {/* Toggle 1: Efek Suara */}
                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-between hover:border-violet-500/30 transition-all duration-300">
                                <div className="space-y-1 pr-2">
                                    <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                                        <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                                        {language === 'id' ? 'EFEK SUARA' : 'SOUND EFFECTS'}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                                        {language === 'id' ? 'Respon klik laci, scan kasir, dan notifikasi harian' : 'Button clicks, register drawers and system notifications'}
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => { toggleSound(); playClickSound(); }}
                                    className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 cursor-pointer ${soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <motion.div 
                                        layout
                                        className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"
                                        animate={{ x: soundEnabled ? 24 : 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>

                            {/* Toggle 2: Musik Latar */}
                            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-between hover:border-violet-500/30 transition-all duration-300">
                                <div className="space-y-1 pr-2">
                                    <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                                        <Music className="w-4 h-4 text-violet-400 animate-pulse" />
                                        {language === 'id' ? 'MUSIK LATAR' : 'BACKGROUND MUSIC'}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                                        {language === 'id' ? 'Musik latar belakang cyber room sci-fi drone lounge' : 'Sci-Fi drone background lounge soundscape'}
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => { toggleAmbience(); playClickSound(); }}
                                    className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 cursor-pointer ${ambienceEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <motion.div 
                                        layout
                                        className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"
                                        animate={{ x: ambienceEnabled ? 24 : 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-[2.5rem] bg-[#090615] border border-white/10 shadow-xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-amber-500/10 text-amber-500 rounded-3xl group-hover:rotate-12 transition-transform">
                                    <Trash2 size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-white">{t('resetSistem')}</h4>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Global Database Reset</p>
                                </div>
                            </div>
                            <button 
                              onClick={handleReset} 
                              className="p-3 bg-rose-500/10 text-rose-450 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-2xl transition cursor-pointer"
                            >
                                Reset
                            </button>
                        </div>

                        <div className="p-6 rounded-[2.5rem] bg-[#090615] border border-white/10 shadow-xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-rose-500/10 text-rose-450 rounded-3xl group-hover:rotate-12 transition-transform">
                                    <LogOut size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-white">{t('logout')}</h4>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Exit Active Session</p>
                                </div>
                            </div>
                            <button 
                              onClick={handleLogout} 
                              className="p-3 bg-rose-500/10 text-rose-450 border border-rose-500/20 hover:bg-rose-500 hover:text-white rounded-2xl transition cursor-pointer"
                            >
                              Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Avatar Gallery Modal */}
            <AnimatePresence>
                {isGalleryOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsGalleryOpen(false)} className="absolute inset-0 bg-black/85 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-[#090615] border border-white/10 p-10 rounded-[3rem] w-full max-w-xl shadow-2xl text-center">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-8">{t('pilihAvatarBaru')}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                                {AVATAR_GALLERY.map((url, i) => (
                                    <motion.button
                                        key={i}
                                        whileHover={{ scale: 1.08 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => { playClickSound(); setPhotoURL(url); setIsGalleryOpen(false); }}
                                        className={`relative w-24 h-24 rounded-[2rem] overflow-hidden border-2 transition-all ${photoURL === url ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-white/5 hover:border-white/10'}`}
                                    >
                                        <img src={url} alt="Ava" className="w-full h-full object-cover bg-slate-900" />
                                        {photoURL === url && <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><Zap className="text-emerald-450 text-emerald-400" size={32} /></div>}
                                    </motion.button>
                                ))}
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <button onClick={() => fileInputRef.current?.click()} className="py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">
                                    📷 UPLOAD FROM DEVICE
                                </button>
                                <button onClick={() => setIsGalleryOpen(false)} className="py-4 bg-white/5 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all cursor-pointer">
                                    {t('cancel')}
                                </button>
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
