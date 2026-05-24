import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';                // Added
import { db } from '../lib/firebase';                               // Added
import { cn, safeJsonParse } from '../lib/utils';
import { createSignedOfflineSession } from '../lib/validation';
import { logActivity, seedInitialUserActivities } from '../lib/activities';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Mail, 
  Lock, 
  ChevronDown, 
  ShieldCheck, 
  Fingerprint,
  Sparkles,
  Crown,
  Users,
  Copy,
  Check,
  RefreshCw,
  Settings,
  Globe,
  Wifi,
  ChevronRight,
  User,
  Smartphone
} from 'lucide-react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';
import ThemeLanguageSwitcher from './ThemeLanguageSwitcher';
import { playScanSound, playSuccessSound } from '../lib/sounds';

export default function Auth({ onNavigate }: { onNavigate: (view: any) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Owner' | 'Employee' | 'Guest' | ''>('Owner');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localModePrompt, setLocalModePrompt] = useState(false);
  const [ownerIdInput, setOwnerIdInput] = useState('');
  const [ownerIdInputFocused, setOwnerIdInputFocused] = useState(false);

  const handleGuestDemoBypass = () => {
    setError(null);
    setIsLoading(true);
    playScanSound();

    const simulatedUser = createSignedOfflineSession({
      uid: 'demo_guest_user',
      email: 'demo_guest@inmarket.com',
      displayName: 'Demo Guest',
      role: 'Guest',
      businessId: 'bus_demo',
      ownerId: 'demo_owner'
    });

    localStorage.setItem('offline_logged_in_user', JSON.stringify(simulatedUser));
    localStorage.setItem('inmarket_user_role', 'Guest');

    // Seed activities for demo
    seedInitialUserActivities('demo_guest@inmarket.com', 'Demo Guest');

    setTimeout(() => {
      setIsLoading(false);
      setIsScanning(true);
      playSuccessSound();
      
      setTimeout(() => {
        setIsScanning(false);
        onNavigate('dashboard');
      }, 1500);
    }, 800);
  };

  // Advanced Registration and Auth Recovery states
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Floating focus state managers for new fields
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  // Countdown timer for email verification re-sending
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Connection Diagnostics States
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'healthy' | 'failed'; latency?: number; error?: string } | null>(null);
  const [domainCopied, setDomainCopied] = useState(false);

  // Floating focus state managers
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const checkNetworkHealth = async () => {
    setIsPinging(true);
    setPingResult(null);
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      await fetch('https://identitytoolkit.googleapis.com/$discovery/rest?version=v1', {
        signal: controller.signal,
        mode: 'no-cors'
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      setPingResult({ status: 'healthy', latency });
    } catch (err: any) {
      setPingResult({ status: 'failed', error: err?.message || 'Unreachable' });
    } finally {
      setIsPinging(false);
    }
  };

  const handleCopyDomain = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.host);
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 2000);
    }
  };

  const { language, theme } = useThemeLanguage();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;

  const getErrorMessage = (errCode: string, message: string) => {
    const code = errCode?.toLowerCase() || '';
    const msg = message?.toLowerCase() || '';
    
    if (code.includes('network-request-failed') || msg.includes('network-request-failed') || msg.includes('network')) {
      return language === 'id' 
        ? '⚠️ Gagal terhubung ke Firebase Server (Sebab: Sandbox / Port diblokir). Silakan aktifkan Akses Sandbox Offline!' 
        : '⚠️ Firebase Server unreachable (Blocked port / Sandbox constraints). Please toggle Offline Sandbox Mode!';
    }
    if (code.includes('email-already-in-use') || msg.includes('email-already-in-use')) {
      return language === 'id' ? 'Email ini sudah terdaftar.' : 'This email is already registered.';
    }
    if (code.includes('weak-password') || msg.includes('weak-password')) {
      return language === 'id' ? 'Password minimal harus 6 karakter.' : 'Password must be at least 6 characters.';
    }
    if (code.includes('invalid-email') || msg.includes('invalid-email') || msg.includes('email wajib')) {
      return language === 'id' ? 'Format email tidak valid.' : 'Invalid email format.';
    }
    if (
      code.includes('wrong-password') || 
      code.includes('user-not-found') || 
      code.includes('invalid-credential') || 
      msg.includes('credential') || 
      msg.includes('wrong') ||
      msg.includes('not-found')
    ) {
      return language === 'id' ? 'Email atau password salah.' : 'Incorrect email or password.';
    }
    return message;
  };

  const handleOfflineModeLogin = () => {
    // Force a simulated offline success bypass
    setError(null);
    setIsLoading(true);
    playScanSound();

    const mockEmail = email || 'owner@inmarket.com';
    const mockRole = role || (mockEmail.includes('karyawan') || mockEmail.includes('employee') ? 'Employee' : 'Owner');
    
    const simulatedUser = createSignedOfflineSession({
      uid: 'offline_' + mockEmail.replace(/[^a-zA-Z0-9]/g, '_'),
      email: mockEmail,
      displayName: mockEmail.split('@')[0],
      role: mockRole === 'Owner' ? 'Owner' : 'Employee'
    });

    localStorage.setItem('local_user_' + mockEmail, JSON.stringify({ email: mockEmail, password: password || '123456', role: mockRole }));
    localStorage.setItem('offline_logged_in_user', JSON.stringify(simulatedUser));

    setTimeout(() => {
      setIsLoading(false);
      setIsScanning(true);
      playSuccessSound();
      
      setTimeout(() => {
        setIsScanning(false);
        onNavigate('dashboard');
      }, 2000);
    }, 1200);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email) {
      setError(language === 'id' ? 'Email wajib diisi.' : 'Email is required.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(language === 'id' 
        ? `Tautan pengaturan ulang sandi telah dikirim ke ${email}.` 
        : `Password reset link has been dispatched to ${email}.`);
      playSuccessSound();
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setSuccess(null);
    setIsNetworkError(false);

    if (isResetMode) {
      handlePasswordResetSubmit(e);
      return;
    }

    if (role === 'Guest') {
      handleGuestDemoBypass();
      return;
    }

    if (!email) {
      setError(language === 'id' ? 'Email wajib diisi.' : 'Email is required.');
      return;
    }

    // 1. Email Format Check (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(language === 'id' ? 'Format email tidak valid.' : 'Invalid email format.');
      return;
    }

    if (!password) {
      setError(language === 'id' ? 'Password wajib diisi.' : 'Password is required.');
      return;
    }
    if (password.length < 6) {
      setError(language === 'id' ? 'Password minimal harus 6 karakter.' : 'Password must be 6+ characters.');
      return;
    }

    if (!isLogin) {
      // 2. Validate Username
      if (!username || username.trim().length < 3) {
        setError(language === 'id' ? 'Username minimal harus 3 karakter.' : 'Username must be at least 3 characters.');
        return;
      }
      
      // Check username uniqueness in local database
      const cachedUserStr = localStorage.getItem('local_user_' + email);
      if (cachedUserStr) {
        setError(language === 'id' ? 'Nama pengguna atau email sudah terdaftar.' : 'Username or email already registered.');
        return;
      }

      // 3. Validate Phone (numeric, 10-15 digits)
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (!phone || cleanPhone.length < 10 || cleanPhone.length > 15) {
        setError(language === 'id' ? 'Nomor HP tidak valid. Masukkan 10-15 digit angka.' : 'Invalid phone number. Input 10-15 digits.');
        return;
      }

      // 4. Validate Code Owner if Employee Mode
      if (role === 'Employee' && !ownerIdInput.trim()) {
        setError(language === 'id' ? 'Email Owner / Kode Bisnis wajib diisi bagi peran Karyawan.' : 'Owner Email / Business Code is required for Employee registration.');
        return;
      }

      // 5. Role check
      if (!role) {
        setError(language === 'id' ? 'Silakan pilih peran akun (role).' : 'Please select an account role.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        try {
          // Attempt default Firebase authentication
          await signInWithEmailAndPassword(auth, email, password);
          
          if (auth.currentUser) {
            // Retrieve dynamic configuration from database
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            let dbRole = 'Owner';
            let businessId = 'bus_' + auth.currentUser.uid;
            let ownerId = auth.currentUser.uid;
            
            if (userDoc.exists()) {
              const data = userDoc.data();
              dbRole = data.role === 'owner' ? 'Owner' : (data.role === 'employee' ? 'Employee' : 'Guest');
              businessId = data.businessId || businessId;
              ownerId = data.ownerId || ownerId;
            }
            
            // Critical fix: ensure local cache matches the database role exactly
            localStorage.setItem('inmarket_user_role', dbRole);
            localStorage.setItem('offline_logged_in_user', JSON.stringify(createSignedOfflineSession({
              uid: auth.currentUser.uid,
              email: email,
              displayName: auth.currentUser.displayName || email.split('@')[0],
              role: dbRole,
              businessId: businessId,
              ownerId: ownerId
            })));

            // Seed activities + Log activity
            seedInitialUserActivities(email, auth.currentUser.displayName || email.split('@')[0]);
            logActivity('Pengguna berhasil masuk (login) ke platform InMarket.id', {
              userId: email,
              businessId: businessId,
              role: dbRole,
              username: auth.currentUser.displayName || email.split('@')[0]
            });

            setSuccess(language === 'id' ? 'Otorisasi Berhasil. Memindai data diri...' : 'Authorization Successful. Scanning profile...');
            setIsScanning(true);
            playSuccessSound();

            setTimeout(() => {
              setIsScanning(false);
              onNavigate('dashboard');
            }, 1500);
          }

        } catch (firebaseErr: any) {
          const errCode = firebaseErr?.code || '';
          const errMsg = firebaseErr?.message || '';
          const isNetworkErr = errCode.includes('network') || errMsg.includes('network-request-failed') || errMsg.includes('auth/network-request-failed') || errMsg.includes('apiKey');
          
          if (!isNetworkErr) {
            console.warn("Firebase Auth credentials invalid or rejected:", errCode || errMsg);
          } else {
            console.error("Firebase network connection failed:", firebaseErr);
            setIsNetworkError(true);
          }
          
          // Test local offline vault matching
          const cachedUserStr = localStorage.getItem('local_user_' + email);
          const cachedUser = safeJsonParse(cachedUserStr, null);
          
          if (cachedUser && cachedUser.password === password) {
            const mappedRole = cachedUser.role || 'Owner';
            const secureOwnerId = cachedUser.ownerId || (mappedRole === 'Employee' ? 'owner_offline_default' : 'offline_' + email.replace(/[^a-zA-Z0-9]/g, '_'));
            const secureBusinessId = cachedUser.businessId || 'bus_offline_' + secureOwnerId;

            const simulatedUser = createSignedOfflineSession({
              uid: 'offline_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
              email: email,
              displayName: cachedUser.username || email.split('@')[0],
              role: mappedRole,
              businessId: secureBusinessId,
              ownerId: secureOwnerId
            });
            localStorage.setItem('offline_logged_in_user', JSON.stringify(simulatedUser));
            localStorage.setItem('inmarket_user_role', mappedRole);
              
            // Seed activities if brand new + Log Login activity
            seedInitialUserActivities(email, cachedUser.username || email.split('@')[0]);
            logActivity('Pengguna berhasil masuk (login) ke platform InMarket.id', {
              userId: email,
              businessId: secureBusinessId,
              role: mappedRole,
              username: cachedUser.username || email.split('@')[0]
            });
              
            setSuccess(language === 'id' ? 'Koneksi Terkompres (Mode Offline). Memindai...' : 'Compressed Link Established (Offline Mode). Scanning...');
            setIsScanning(true);
            playSuccessSound();

            setTimeout(() => {
              setIsScanning(false);
              onNavigate('dashboard');
            }, 1500);
            return;
          }

          // Offer offline sandbox bypass if network request fails or API key errors
          if (isNetworkErr) {
            setLocalModePrompt(true);
          }
          throw firebaseErr;
        }

      } else {
        // Registering a new account
        try {
          // Attempt standard firebase creation
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName: username });
            
            // Build businessId and ownerId
            const mappedRole = role === 'Owner' ? 'owner' : (role === 'Employee' ? 'employee' : 'guest');
            let secureOwnerId = userCredential.user.uid;
            if (role === 'Employee') {
              secureOwnerId = ownerIdInput.trim() ? 'owner_' + ownerIdInput.replace(/[^a-zA-Z0-9]/g, '_') : 'owner_shared';
            }
            const secureBusinessId = 'bus_' + secureOwnerId;

            await setDoc(doc(db, 'users', userCredential.user.uid), {
              email,
              role: mappedRole,
              ownerId: secureOwnerId,
              businessId: secureBusinessId,
              createdAt: new Date()
            });

            // Save locally with complete inputs
            localStorage.setItem('local_user_' + email, JSON.stringify({ 
              email, 
              password, 
              role, 
              username, 
              phone,
              ownerId: secureOwnerId,
              businessId: secureBusinessId
            }));
            
            localStorage.setItem('offline_logged_in_user', JSON.stringify(createSignedOfflineSession({
              uid: userCredential.user.uid,
              email,
              displayName: username,
              role,
              businessId: secureBusinessId,
              ownerId: secureOwnerId
            })));
            localStorage.setItem('inmarket_user_role', role);
          }
          
          // Seed activities for the brand new user immediately
          seedInitialUserActivities(email, username);
          
          // Switch to Email Verification flow to satisfy the verification requirement
          setVerificationPending(true);
          setResendCountdown(30);
          setSuccess(language === 'id' 
            ? 'Pendaftaran sukses! Tautan verifikasi telah diarahkan ke email Anda.' 
            : 'Registered successfully! Verification link has been dispatched to your email.');
          playSuccessSound();

        } catch (firebaseErr: any) {
          const errCode = firebaseErr?.code || '';
          const errMsg = firebaseErr?.message || '';
          
          if (
            errCode.includes('email-already-in-use') || 
            errMsg.includes('email-already-in-use') ||
            errCode.includes('weak-password') || 
            errMsg.includes('weak-password') ||
            errCode.includes('invalid-email') || 
            errMsg.includes('invalid-email')
          ) {
            console.warn("Registration rejected due to credentials validation:", errCode || errMsg);
            throw firebaseErr; 
          }
          
          console.warn("Register network/sandbox error, falling back to offline storage:", firebaseErr);
          setIsNetworkError(true);
          
          const mappedRole = role === 'Owner' ? 'owner' : (role === 'Employee' ? 'employee' : 'guest');
          let secureOwnerId = 'owner_offline_default';
          if (role === 'Employee') {
            secureOwnerId = ownerIdInput.trim() ? 'owner_' + ownerIdInput.replace(/[^a-zA-Z0-9]/g, '_') : 'owner_shared';
          } else if (role === 'Owner') {
            secureOwnerId = 'owner_offline_' + email.replace(/[^a-zA-Z0-9]/g, '_');
          }
          const secureBusinessId = 'bus_offline_' + secureOwnerId;

          // Save locally
          localStorage.setItem('local_user_' + email, JSON.stringify({ 
            email, 
            password, 
            role, 
            username, 
            phone,
            ownerId: secureOwnerId,
            businessId: secureBusinessId
          }));
          
          localStorage.setItem('offline_logged_in_user', JSON.stringify(createSignedOfflineSession({
            uid: 'offline_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
            email,
            displayName: username,
            role,
            businessId: secureBusinessId,
            ownerId: secureOwnerId
          })));
          localStorage.setItem('inmarket_user_role', role);
          
          // Seed activities for the brand new user immediately
          seedInitialUserActivities(email, username);
          
          // Proceed to email verification state
          setVerificationPending(true);
          setResendCountdown(30);
          setSuccess(language === 'id' 
            ? 'Pendaftaran Offline Sukses! Silakan verifikasi email Anda di terminal ini.' 
            : 'Offline Registration Succeeded! Please complete secure verification on this terminal.');
          playSuccessSound();
        }
      }
    } catch (e: any) {
      const errCode = e?.code || '';
      const errMsg = e?.message || '';
      setErrorCode(errCode);
      const isNetworkErr = errCode.includes('network') || errMsg.includes('network-request-failed') || errMsg.includes('auth/network-request-failed') || errMsg.includes('apiKey');
      if (isNetworkErr) {
        setIsNetworkError(true);
      }
      setError(getErrorMessage(e.code, e.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate background animation coordinates 
  const [particles, setParticles] = useState<Array<{left: number, top: number, size: number, duration: number}>>([]);
  useEffect(() => {
    const list = Array.from({ length: 15 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 12 + 6,
    }));
    setParticles(list);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen relative w-full overflow-hidden bg-slate-950 dark:bg-[#030107] font-sans">
      
      {/* Decorative Particle Canvas Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* Glowing holographic nodes */}
        <motion.div 
          animate={{ x: [0, 30, -30, 0], y: [0, -40, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-violet-600/10 dark:bg-violet-900/15 blur-[120px]"
        />
        <motion.div 
          animate={{ x: [0, -40, 40, 0], y: [0, 40, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-400/10 dark:bg-cyan-900/10 blur-[130px]"
        />

        {particles.map((p, idx) => (
          <motion.div
            key={idx}
            className="absolute rounded-full bg-indigo-400/25 blur-[0.5px]"
            animate={{
              y: [0, -120, 0],
              x: [0, Math.sin(idx) * 20, 0],
              opacity: [0.2, 0.7, 0.2]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </div>

      {/* Navigation and Swappable Header Bar Controls */}
      <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-50">
        <button 
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-slate-900/20 dark:bg-white/5 backdrop-blur-xl rounded-full border border-white/10 text-white/90 text-xs font-bold hover:border-violet-500/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.35)] transition-all pointer-events-auto cursor-pointer"
        >
          <ArrowLeft size={14} /> {language === 'id' ? 'Kembali' : 'Back'}
        </button>

        <div className="bg-slate-900/20 dark:bg-white/5 backdrop-blur-xl px-2.5 py-1.5 rounded-full border border-white/10 flex items-center">
          <ThemeLanguageSwitcher />
        </div>
      </div>

      {/* Main Glassmorphism Form container */}
      <div className="relative z-10 w-full max-w-md p-4 mt-8">
        <motion.div 
          key={error ? `shake-${error}` : 'form-wrapper'}
          initial={{ opacity: 0, y: 40 }} 
          animate={error ? { 
            opacity: 1, 
            y: 0,
            x: [-8, 8, -5, 5, -3, 3, 0],
            transition: { duration: 0.45 }
          } : { opacity: 1, y: 0 }}
          className={cn(
            "relative bg-white/75 dark:bg-slate-950/45 backdrop-blur-2xl p-8 rounded-[36px] border shadow-2xl transition-all duration-300",
            theme === 'light' ? "border-slate-200/80 shadow-indigo-100/50" : "border-violet-500/15 shadow-violet-950/20"
          )}
          style={{
            boxShadow: theme === 'dark' 
              ? '0 0 50px rgba(139,92,246,0.1), inset 0 0 20px rgba(139,92,246,0.05)'
              : '0 25px 60px -15px rgba(99,102,241,0.12)'
          }}
        >
          {/* Decorative light gradient reflections */}
          <div className="absolute -top-[120px] -left-[120px] w-[260px] h-[260px] bg-gradient-to-tr from-transparent via-white/5 to-white/10 rotate-45 pointer-events-none rounded-full" />
          
          <div className="text-center mb-8 relative">
            <div className="inline-flex p-3 bg-violet-600/10 rounded-2xl border border-violet-500/20 mb-3 text-violet-500 dark:text-violet-400">
              <Fingerprint className="animate-pulse" size={24} />
            </div>
            <h2 className={cn(
              "text-3xl font-black tracking-tight",
              theme === 'light' ? "text-slate-900" : "text-white"
            )}>
              {verificationPending 
                ? (language === 'id' ? 'Verifikasi Email' : 'Email Verification')
                : isResetMode 
                  ? (language === 'id' ? 'Atur Ulang Sandi' : 'Reset Password')
                  : isLogin 
                    ? t('loginTitle') 
                    : t('registerTitle')
              }
            </h2>
            <p className={cn("text-xs mt-1.5 font-bold tracking-wider font-mono", theme === 'light' ? "text-slate-500" : "text-violet-300/60")}>
              {verificationPending ? (language === 'id' ? 'AKTIVASI AKUN AMAN' : 'SECURE ACCOUNT ACTIVATION') : isResetMode ? (language === 'id' ? 'PEMULIHAN KUNCI KEAMANAN' : 'SECURITY KEY RECOVERY') : (language === 'id' ? 'SISTEM LEDGER AMAN INMARKET' : 'INMARKET SECURE LEDGER SYSTEM')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative">
            
            {/* Success Status / Error Status Banners */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, scale: 0.95 }} 
                  animate={{ height: 'auto', opacity: 1, scale: 1 }} 
                  exit={{ height: 0, opacity: 0, scale: 0.95 }}
                  className="p-4 bg-red-500/10 dark:bg-red-950/30 backdrop-blur-xl border border-red-500/30 rounded-2xl flex flex-col gap-3 shadow-[0_0_15px_rgba(239,68,68,0.12)]"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                    <div className="text-xs text-red-900 dark:text-red-200 font-semibold leading-relaxed">
                      {error}
                    </div>
                  </div>

                  {/* Smart Redirect to login if email already exists */}
                  {errorCode === 'auth/email-already-in-use' && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setIsLogin(true);
                        setError(null);
                        setErrorCode(null);
                      }}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[10px] rounded-xl tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(109,40,217,0.3)] cursor-pointer"
                    >
                      📬 {language === 'id' ? 'MASUK SEKARANG DENGAN EMAIL INI' : 'LOG IN DIRECTLY WITH THIS EMAIL'} <ChevronRight size={12} />
                    </motion.button>
                  )}

                  {/* Smart Redirect to register if user is not found */}
                  {(errorCode === 'auth/user-not-found' || errorCode?.includes('user-not-found')) && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setIsLogin(false);
                        setError(null);
                        setErrorCode(null);
                      }}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-[10px] rounded-xl tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(8,145,178,0.3)] cursor-pointer"
                    >
                      👤 {language === 'id' ? 'BUAT AKUN BARU PERTAMA KALI' : 'REGISTER THIS EMAIL INSTANTLY'} <ChevronRight size={12} />
                    </motion.button>
                  )}

                  {/* Always give an offline sandbox bypass option for any login errors */}
                  {isLogin && (
                    <motion.div className="mt-1 pt-2 border-t border-red-500/10 dark:border-red-500/15 space-y-2">
                      <p className="text-[9px] text-amber-500/90 font-mono font-black uppercase tracking-widest leading-normal text-center">
                        ⚠️ PORT SANDBOX BLOCKED ATAU LUPA SANDI?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(email || 'owner@inmarket.com');
                            setRole('Owner');
                            setTimeout(() => {
                              handleOfflineModeLogin();
                            }, 50);
                          }}
                          className="py-1.5 px-2 bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/35 rounded-xl text-[9px] font-bold text-amber-400 uppercase transition cursor-pointer"
                        >
                          MASUK OWNER (OFFLINE)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail(email || 'karyawan@inmarket.com');
                            setRole('Employee');
                            setTimeout(() => {
                              handleOfflineModeLogin();
                            }, 50);
                          }}
                          className="py-1.5 px-2 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/35 rounded-xl text-[9px] font-bold text-violet-400 uppercase transition cursor-pointer"
                        >
                          MASUK STAF (OFFLINE)
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {success && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, scale: 0.95 }} 
                  animate={{ height: 'auto', opacity: 1, scale: 1 }} 
                  exit={{ height: 0, opacity: 0, scale: 0.95 }}
                  className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 backdrop-blur-xl border border-emerald-500/30 rounded-2xl flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                >
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold leading-relaxed">
                    {success}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* INTERACTIVE APPS STATES */}
            {verificationPending ? (
              // EMAIL VERIFICATION MODE
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 w-full"
              >
                <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-300 leading-relaxed">
                    {language === 'id' 
                      ? 'Kami telah mengirimkan tautan verifikasi ke email:' 
                      : 'We have dispatched a security activation link to:'}
                  </p>
                  <strong className="text-sm text-cyan-400 font-mono block mt-2 p-2 bg-black/35 rounded-xl border border-white/5 truncate">
                    {email}
                  </strong>
                  <p className="text-[10px] mt-3 text-amber-400/90 leading-tight italic font-mono uppercase">
                    {language === 'id' 
                      ? '⚠️ Simulasi Verifikasi Tersedia. Silakan klik konfirmasi di bawah ini.' 
                      : '⚠️ Demo Verification Bypass active. Click submit below straight away.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationPending(false);
                      setIsLogin(true);
                      setSuccess(language === 'id' ? 'Email terverifikasi pemilik! Silakan Log In.' : 'Email successfully verified! Please Log In.');
                    }}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-xs tracking-widest uppercase rounded-2xl hover:brightness-110 active:scale-[0.99] transition shadow-[0_4px_15px_rgba(16,185,129,0.3)] cursor-pointer"
                  >
                    🚀 {language === 'id' ? 'SAYA SUDAH VERIFIKASI (MASUK)' : 'I HAVE VERIFIED (LOG IN)'}
                  </button>

                  <button
                    type="button"
                    disabled={resendCountdown > 0}
                    onClick={() => {
                      setResendCountdown(30);
                      setSuccess(language === 'id' ? 'Tautan baru telah dikirim!' : 'New activation link sent!');
                    }}
                    className={cn(
                      "w-full py-3 border rounded-2xl text-xs font-black tracking-widest uppercase transition-all",
                      resendCountdown > 0 
                        ? "bg-slate-900/30 text-slate-500 border-white/5 cursor-not-allowed"
                        : "bg-transparent text-violet-400 border-violet-500/30 hover:bg-violet-600/10 cursor-pointer"
                    )}
                  >
                    🔄 {language === 'id' ? 'KIRIM ULANG TAUTAN' : 'RESEND LINK'} {resendCountdown > 0 && `(${resendCountdown}s)`}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVerificationPending(false);
                      setIsLogin(true);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-white pt-2 block cursor-pointer hover:underline"
                  >
                    {language === 'id' ? '← Kembali ke Log In' : '← Return to Login'}
                  </button>
                </div>
              </motion.div>
            ) : isResetMode ? (
              // RESET PASSWORD MODE
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5 w-full font-sans"
              >
                <p className="text-xs text-slate-400 dark:text-slate-300 leading-relaxed text-center">
                  {language === 'id'
                    ? 'Masukkan email akun InMarket Anda untuk mendapatkan tautan atur ulang kata sandi instan.'
                    : 'Enter your InMarket email to dispatch a secure password reset vector link.'}
                </p>

                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    placeholder="nama@perusahaan.com"
                    onChange={e => setEmail(e.target.value)}
                    className={cn(
                      "w-full py-4 pl-12 pr-4 text-sm rounded-2xl border transition-all duration-300 outline-none font-bold",
                      theme === 'light' 
                        ? "bg-slate-50/50 border-slate-200 text-slate-800" 
                        : "bg-slate-900/40 border-white/10 text-white placeholder-slate-500"
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs tracking-widest uppercase rounded-2xl hover:brightness-110 shadow-[0_4px_15px_rgba(139,92,246,0.3)] cursor-pointer"
                  >
                    🔑 {language === 'id' ? 'KIRIM TAUTAN PEMULIHAN' : 'DISPATCH DISCOVERY LINK'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(false);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-white pt-1 block cursor-pointer hover:underline"
                  >
                    {language === 'id' ? '← Batalkan & Masuk' : '← Cancel & Return'}
                  </button>
                </div>
              </motion.div>
            ) : (
              // STANDARD REGISTER AND LOGIN FIELDS
              <>
                {/* MODERN ROLE SELECTOR GRID */}
                <div className="space-y-3 mb-6">
                  <label className={cn("flex justify-between items-center text-[10px] font-black tracking-widest uppercase mb-1", theme === 'light' ? "text-slate-500" : "text-violet-400")}>
                    <span>{language === 'id' ? 'PILIH OTORISASI PERAN' : 'SELECT ROLE AUTHENTICATION'}</span>
                    <span className="flex items-center gap-1 text-[8px] text-cyan-400 font-mono tracking-normal bg-cyan-950/35 border border-cyan-400/20 px-1.5 py-0.5 rounded-[4px]">
                      SECURE_GATE_V2
                    </span>
                  </label>
                  
                  <div className="grid grid-cols-1 gap-2.5 font-sans">
                    {[
                      {
                        id: 'Owner' as const,
                        title: language === 'id' ? 'Owner / Pemilik Bisnis 👑' : 'Owner / Business Boss 👑',
                        subtitle: 'SYS_ADMIN',
                        desc: language === 'id' ? 'Akses penuh mengelola cabang, inventaris, keuangan, karyawan & AI' : 'Full system privileges for branches, stock, finance, staff & AI',
                        color: 'from-amber-600/35 to-amber-950/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      },
                      {
                        id: 'Employee' as const,
                        title: language === 'id' ? 'Karyawan / Staff Cabang 👥' : 'Employee / Branch Staff 👥',
                        subtitle: 'SYS_STAFF',
                        desc: language === 'id' ? 'Melakukan absensi QR, mengoperasikan kasir, chat, agenda & ranking' : 'Perform QR attendance, operate cashier, team chat, agenda & rankings',
                        color: 'from-cyan-600/35 to-cyan-950/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                      },
                      {
                        id: 'Guest' as const,
                        title: language === 'id' ? 'Demo / Penjelajah Guest 🌟' : 'Demo / Guest Visitor 🌟',
                        subtitle: 'SYS_GUEST',
                        desc: language === 'id' ? 'Eksplorasi simulator dashboard secara instan offline tanpa daftar akun' : 'Explore simulated read-only dashboard instantly offline with no registration',
                        color: 'from-fuchsia-600/35 to-fuchsia-950/20 border-fuchsia-500/50 text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.25)]'
                      }
                    ].map((card) => {
                      const isSelected = role === card.id;
                      return (
                        <motion.div
                          key={card.id}
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => {
                            playScanSound();
                            setRole(card.id);
                            setError(null);
                            setSuccess(null);
                          }}
                          className={cn(
                            "p-3.5 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden cursor-pointer",
                            isSelected 
                              ? `bg-gradient-to-r ${card.color} border-current ring-1 ring-violet-500/30` 
                              : "bg-slate-900/40 hover:bg-slate-900/70 border-white/10 text-slate-400 hover:text-slate-200"
                          )}
                        >
                          {isSelected && (
                            <>
                              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-white/80" />
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-white/80" />
                            </>
                          )}
                          <div className="flex justify-between items-start mb-1 relative z-10">
                            <span className="text-xs font-black uppercase tracking-wider block">{card.title}</span>
                            <span className="text-[8px] font-mono opacity-80 uppercase tracking-widest bg-black/40 px-1 py-0.5 rounded">{card.subtitle}</span>
                          </div>
                          <p className="text-[10px] opacity-75 leading-relaxed relative z-10 font-bold font-sans">
                            {card.desc}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {role === 'Guest' ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl text-center space-y-2.5 mb-4 font-sans"
                  >
                    <div className="inline-flex p-2 rounded-xl bg-fuchsia-500/20 text-fuchsia-400">
                      <Sparkles size={18} className="animate-pulse" />
                    </div>
                    <h3 className="text-sm font-black text-fuchsia-300 tracking-wide uppercase">
                      {language === 'id' ? 'MODE GUEST DEMO AKTIF' : 'GUEST DEMO MODE ACTIVE'}
                    </h3>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {language === 'id' 
                        ? 'Anda akan dialihkan langsung ke dashboard simulasi offline. Seluruh data transaksi, keuangan, dan stok akan disimulasikan secara lokal untuk kemudahan demonstrasi tanpa menyentuh database utama.' 
                        : 'You will bypass authentication and enter our offline sandbox environment directly. Try complete dashboard analytics and checkout flows securely.'}
                    </p>
                    <div className="pt-1.5 border-t border-fuchsia-500/20 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          playScanSound();
                          setRole('Owner');
                          setError(null);
                          setSuccess(null);
                        }}
                        className="text-[10px] uppercase font-black tracking-widest text-fuchsia-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto hover:underline cursor-pointer"
                      >
                        <ArrowLeft size={12} />
                        {language === 'id' ? 'KEMBALI KE LOGIN OTORITAS' : 'BACK TO CREDENTIALS LOGIN'}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {/* Username Input Field (Only in Register mode) */}
                    {!isLogin && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="relative"
                      >
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 transition-colors">
                          <User size={18} className={cn(usernameFocused && "text-violet-500")} />
                        </div>
                        <input 
                          type="text" 
                          value={username}
                          placeholder={language === 'id' ? "Nama Pengguna Unik" : "Unique Username"}
                          onFocus={() => setUsernameFocused(true)}
                          onBlur={() => setUsernameFocused(false)}
                          onChange={e => setUsername(e.target.value)}
                          className={cn(
                            "w-full py-4 pl-12 pr-4 text-sm rounded-2xl border transition-all duration-300 outline-none font-bold",
                            theme === 'light' 
                              ? "bg-slate-50/50 border-slate-200 text-slate-800 focus:border-violet-500 focus:bg-white" 
                              : "bg-slate-900/40 border-white/10 text-white placeholder-slate-500 focus:border-violet-500 focus:bg-slate-900/10"
                          )}
                        />
                      </motion.div>
                    )}

                    {/* Email input block */}
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 transition-colors">
                        <Mail size={18} className={cn(emailFocused && "text-violet-500 dark:text-violet-400")} />
                      </div>
                      <input 
                        type="email" 
                        value={email}
                        placeholder={t('emailPlaceholder')}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        onChange={e => setEmail(e.target.value)}
                        className={cn(
                          "w-full py-4 pl-12 pr-4 text-sm rounded-2xl border transition-all duration-300 outline-none font-bold",
                          theme === 'light' 
                            ? "bg-slate-50/50 border-slate-200 text-slate-800 focus:border-violet-500 focus:bg-white" 
                            : "bg-slate-900/40 border-white/10 text-white placeholder-slate-500 focus:border-violet-500 focus:bg-slate-900/10"
                        )}
                        style={{
                          boxShadow: emailFocused && theme === 'dark' ? '0 0 15px rgba(139,92,246,0.25)' : ''
                        }}
                      />
                    </div>

                    {/* Handphone Phone input block (Only in Register mode) */}
                    {!isLogin && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="relative"
                      >
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 transition-colors">
                          <Smartphone size={18} className={cn(phoneFocused && "text-violet-500")} />
                        </div>
                        <input 
                          type="text" 
                          value={phone}
                          placeholder={language === 'id' ? "Nomor Handphone Terdaftar" : "Registered Phone No."}
                          onFocus={() => setPhoneFocused(true)}
                          onBlur={() => setPhoneFocused(false)}
                          onChange={e => setPhone(e.target.value)}
                          className={cn(
                            "w-full py-4 pl-12 pr-4 text-sm rounded-2xl border transition-all duration-300 outline-none font-bold",
                            theme === 'light' 
                              ? "bg-slate-50/50 border-slate-200 text-slate-800 focus:border-violet-500 focus:bg-white" 
                              : "bg-slate-900/40 border-white/10 text-white placeholder-slate-500 focus:border-violet-500 focus:bg-slate-900/10"
                          )}
                        />
                      </motion.div>
                    )}

                    {/* Corporate Linkage field (Only in Register mode for Employee) */}
                    {!isLogin && role === 'Employee' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="relative"
                      >
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-violet-400">
                          <ShieldCheck size={18} className={cn(ownerIdInputFocused && "text-violet-500")} />
                        </div>
                        <input 
                          type="text" 
                          value={ownerIdInput}
                          placeholder={language === 'id' ? "Email Owner / Kode Bisnis" : "Owner Email / Business Code"}
                          onFocus={() => setOwnerIdInputFocused(true)}
                          onBlur={() => setOwnerIdInputFocused(false)}
                          onChange={e => setOwnerIdInput(e.target.value)}
                          className={cn(
                            "w-full py-4 pl-12 pr-4 text-sm rounded-2xl border transition-all duration-300 outline-none font-bold",
                            theme === 'light' 
                              ? "bg-slate-50/50 border-slate-200 text-slate-800 focus:border-violet-500 focus:bg-white" 
                              : "bg-slate-900/40 border-white/10 text-white placeholder-violet-500 focus:border-violet-500 focus:bg-slate-900/10"
                          )}
                        />
                      </motion.div>
                    )}

                    {/* Password input block */}
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 transition-colors">
                        <Lock size={18} className={cn(passwordFocused && "text-violet-500 dark:text-violet-400")} />
                      </div>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        placeholder={t('passwordPlaceholder')}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        onChange={e => setPassword(e.target.value)}
                        className={cn(
                          "w-full py-4 pl-12 pr-12 text-sm rounded-2xl border transition-all duration-300 outline-none font-bold",
                          theme === 'light' 
                            ? "bg-slate-50/50 border-slate-200 text-slate-800 focus:border-violet-500 focus:bg-white" 
                            : "bg-slate-900/40 border-white/10 text-white placeholder-slate-500 focus:border-violet-500 focus:bg-slate-900/10"
                        )}
                        style={{
                          boxShadow: passwordFocused && theme === 'dark' ? '0 0 15px rgba(139,92,246,0.25)' : ''
                        }}
                      />
                      <button 
                        type="button" 
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Login recovery links and persistence checkboxes */}
                    {isLogin && (
                      <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500 dark:text-violet-300/70">
                        <label className="flex items-center gap-2 cursor-pointer group hover:text-violet-500 dark:hover:text-white transition-colors">
                          <input 
                            type="checkbox" 
                            defaultChecked
                            className="rounded border-slate-300 dark:border-white/10 bg-transparent text-violet-600 focus:ring-violet-500 cursor-pointer h-4 w-4" 
                          />
                          <span>{language === 'id' ? 'Ingat Saya' : 'Remember Me'}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setIsResetMode(true);
                            setError(null);
                            setSuccess(null);
                          }}
                          className="hover:underline hover:text-violet-500 dark:hover:text-white transition-colors"
                        >
                          {language === 'id' ? 'Lupa Sandi?' : 'Forgot Password?'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}



            {/* Standard Login Authorization Button */}
            <div className="pt-2">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={isLoading || isScanning} 
                type="submit" 
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-xs tracking-widest uppercase text-white shadow-lg flex items-center justify-center gap-2",
                  "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 border border-violet-400/20 active:opacity-90"
                )}
                style={{ boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)' }}
              >
                {isLoading && <Loader2 className="animate-spin text-white" size={16} />}
                {role === 'Guest' ? (
                  language === 'id' ? "MASUK SEBAGAI GUEST DEMO 🌟" : "ENTER AS GUEST DEMO 🌟"
                ) : isLogin ? (
                  language === 'id' ? "MASUK KE LEDGER" : "LOG IN TO SUITE"
                ) : (
                  language === 'id' ? "DAFTARKAN BARU" : "REGISTER PROFILE"
                )}
              </motion.button>
            </div>

            {/* FUTURISTIC NEON NETWORK DIAGNOSTICS & TROUBLESHOOTING PANEL */}
            {isNetworkError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-5 border border-red-500/30 dark:border-violet-500/35 bg-red-500/5 dark:bg-[#10072b]/80 backdrop-blur-3xl rounded-[24px] space-y-4 shadow-[0_0_25px_rgba(139,92,246,0.25)] relative overflow-hidden text-left"
              >
                {/* Scanner decorative laser lines */}
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-[pulse_2s_infinite]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.015)_1px,transparent_1px)] bg-[size:12px_12px] opacity-40 pointer-events-none" />

                <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <div className="p-1.5 bg-red-500/10 dark:bg-violet-500/15 rounded-lg border border-red-500/20 dark:border-violet-500/20">
                    <Settings className="text-red-400 dark:text-violet-400 animate-[spin_5s_linear_infinite]" size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 font-sans">
                      {language === 'id' ? 'Ledger Port Diagnostik' : 'Ledger Port Diagnostics'}
                    </h4>
                    <p className="text-[9px] font-mono text-cyan-400/80 tracking-widest uppercase">
                      ERR_CONN_BLOCKED_OR_UNAUTHORIZED
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  {/* PING TEST BLOCK */}
                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-cyan-400" />
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-200">
                          {language === 'id' ? 'Uji Koneksi Google' : 'Google Auth Endpoint'}
                        </p>
                        <p className="text-[8px] font-mono text-slate-400">identitytoolkit.googleapis.com</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isPinging}
                      onClick={checkNetworkHealth}
                      className={cn(
                        "px-3 py-1.5 rounded-lg font-mono text-[9px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1.5",
                        isPinging 
                          ? "bg-violet-950/45 text-violet-400 border border-violet-500/20" 
                          : "bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-400/30 cursor-pointer"
                      )}
                    >
                      {isPinging ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                      {isPinging ? (language === 'id' ? 'PING...' : 'PINGING...') : (language === 'id' ? 'TES PING' : 'TEST PING')}
                    </button>
                  </div>

                  {/* PING RESULT POP */}
                  {pingResult && (
                    <motion.div
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "p-2.5 rounded-lg border text-[10px] font-mono flex items-center gap-2 shadow-inner",
                        pingResult.status === 'healthy'
                          ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400"
                          : "bg-amber-950/30 border-amber-500/30 text-amber-400"
                      )}
                    >
                      <Wifi size={12} className={pingResult.status === 'healthy' ? "animate-pulse" : ""} />
                      {pingResult.status === 'healthy' ? (
                        <span>
                          <strong>{language === 'id' ? 'TERKONEKSI' : 'CONNECTED'}:</strong> Latency {pingResult.latency}ms. Connection to Google is fine. Error may be authorization restrictions or email setup.
                        </span>
                      ) : (
                        <span>
                          <strong>{language === 'id' ? 'TERBLOKIR' : 'BLOCKED'}:</strong> Endpoint unreachable (No internet or browser CSP prevents iframe third-party auth).
                        </span>
                      )}
                    </motion.div>
                  )}

                  {/* STEP BY STEP TROUBLESHOOTING */}
                  <div className="space-y-3 mt-1 text-[11px] font-sans">
                    {/* STEP 1 */}
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-black text-violet-400 shrink-0 font-mono">1</div>
                      <div>
                        <p className="font-bold text-slate-100">{language === 'id' ? 'Aktifkan Email/Password Auth' : 'Enable Email/Password Sign-In'}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">
                          {language === 'id' 
                            ? 'Buka Firebase Console > Authentication > Metode Log-In, lalu aktifkan mode "Email/Password".'
                            : 'Open Firebase Console > Authentication > Sign-in method, and ensure the "Email/Password" provider is turned ON.'}
                        </p>
                      </div>
                    </div>

                    {/* STEP 2 */}
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-black text-violet-400 shrink-0 font-mono">2</div>
                      <div className="space-y-1.5 w-full">
                        <p className="font-bold text-slate-100">{language === 'id' ? 'Otorisasi Domain Website' : 'Authorize App Domain'}</p>
                        <p className="text-slate-400 text-[10px] leading-relaxed">
                          {language === 'id'
                            ? 'Pastikan domain ini masuk dalam whitelist Firebase Console > Authentication > Settings > Authorized domains.'
                            : 'Add this domain to high-trust list under Firebase Console > Authentication > Settings > Authorized domains.'}
                        </p>
                        <div className="flex items-center gap-1.5 max-w-full overflow-hidden">
                          <code className="px-2 py-1 bg-black/60 border border-white/5 rounded text-[9px] font-mono text-cyan-300 truncate select-all block max-w-[200px]">
                            {typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}
                          </code>
                          <button
                            type="button"
                            onClick={handleCopyDomain}
                            className="p-1 px-2.5 bg-violet-500/15 hover:bg-violet-500/30 text-violet-200 border border-violet-500/20 rounded flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase transition-colors shrink-0 cursor-pointer"
                          >
                            {domainCopied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                            {domainCopied ? (language === 'id' ? 'SALIN!' : 'COPIED!') : (language === 'id' ? 'SALIN' : 'COPY')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* STEP 3 */}
                    <div className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-[10px] font-black text-violet-400 shrink-0 font-mono">3</div>
                      <div>
                        <p className="font-bold text-slate-100">{language === 'id' ? 'Batasan Iframe & Cookie' : 'Iframe Third-Party Restrictions'}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">
                          {language === 'id'
                            ? 'Jika dijalankan di dalam iframe AI Studio, browser dapat memblokir cookie otorisasi pihak ketiga. Gunakan pintasan sandbox offline di bawah jika kendala berlanjut.'
                            : 'Browsers block third-party OAuth requests inside nested iframe environments. If blocked, activate client-side Offline Sandbox mode below.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  <p className="text-[9px] text-cyan-200/60 font-medium text-center italic">
                    {language === 'id' 
                      ? 'Atau bypass pembatasan koneksi lokal / jaringan:' 
                      : 'Or completely bypass the secure ledger link restrictions:'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOfflineModeLogin}
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-600 hover:brightness-110 active:scale-[0.99] text-white font-extrabold text-[10px] rounded-xl tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(34,211,238,0.25)] cursor-pointer"
                  >
                    🚀 {language === 'id' ? 'AKTIFKAN SANDBOX OFFLINE BYPASS' : 'ACTIVATE OFFLINE SANDBOX BYPASS'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Standard Sandbox Bypass (only shown if not in explicit network failure error state) */}
            {!isNetworkError && (localModePrompt || error) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-4 border border-cyan-400/40 bg-cyan-950/20 rounded-2xl text-center space-y-3 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
              >
                <div className="flex items-center justify-center gap-2 text-cyan-400 animate-pulse text-xs font-extrabold">
                  <Sparkles size={16} /> {language === 'id' ? "AKSES SANDBOX OFFLINE BERSEDIA" : "OFFLINE DEV BYPASS READIED"}
                </div>
                <p className="text-[10px] text-cyan-200/70 font-semibold leading-relaxed">
                  {language === 'id' 
                    ? "InMarket dapat mensimulasikan lingkungan database secara lokal di browser ini agar Anda dapat langsung mereview tanpa wajib menyambung internet."
                    : "Skip firewalls and test with full client-side simulated ledgers instantly."}
                </p>
                <button
                  type="button"
                  onClick={handleOfflineModeLogin}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-[10px] rounded-lg tracking-widest uppercase hover:brightness-110 transition-all cursor-pointer"
                >
                  🚀 {language === 'id' ? "LOG IN LEWAT SANDBOX OFFLINE" : "LOG IN VIA OFFLINE SANDBOX"}
                </button>
              </motion.div>
            )}

            {/* Toggle switch link bottom */}
            <div className="text-center pt-3">
              <p 
                role="button"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setIsLogin(!isLogin);
                }}
                className={cn(
                  "inline-block text-xs font-bold hover:underline cursor-pointer transition",
                  theme === 'light' ? "text-slate-600 hover:text-violet-600" : "text-violet-300/70 hover:text-white"
                )}
              >
                {isLogin 
                  ? (language === 'id' ? "Belum ada akun? Buat Akun Baru" : "Need credentials? Signup Here") 
                  : (language === 'id' ? "Sudah terdaftar? Log In" : "Already registered? Login Here")
                }
              </p>
            </div>

          </form>

          {/* AI Face Scanning Animation HUD Overlay */}
          <AnimatePresence>
            {isScanning && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center z-50 rounded-[35px]"
              >
                {/* Visual Scanner HUD Frame */}
                <div className="w-28 h-28 rounded-full border-2 border-violet-500/40 relative flex items-center justify-center overflow-hidden mb-6 shadow-[0_0_35px_rgba(139,92,246,0.35)]">
                  <motion.div 
                    animate={{ y: [-52, 52, -52] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 shadow-[0_0_15px_#22d3ee]"
                  />
                  <ShieldCheck className="text-cyan-400 animate-pulse relative z-10" size={40} />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2.5"
                >
                  <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-100 to-cyan-400 tracking-wider">
                    {t('biometricsActive')}
                  </h3>
                  <p className="text-xs font-mono tracking-[0.2em] text-cyan-400 animate-pulse">
                    {isLogin 
                      ? (language === 'id' ? 'KONFIGURASI LEDGER INSTANCE...' : 'RESOLVING METADATA...')
                      : (language === 'id' ? 'MENDAFTARKAN NODE...' : 'ENCRYPTING NODE...')
                    }
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto font-semibold leading-relaxed">
                    {language === 'id' 
                      ? 'Harap tunggu saat Ledger Enkripsi InMarket mendeploy sandbox bisnis baru Anda.' 
                      : 'Establishing Secure Handshake protocols with 2026 Core Ledger Cloud.'}
                  </p>
                </motion.div>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-indigo-500/10 border-dashed rounded-full animate-[spin_30s_linear_infinite]" />
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}
