/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, Component } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/Dashboard';
import 開啓動畫 from './components/OpeningAnimation';
import OnboardingPopup from './components/OnboardingPopup';
import Auth from './components/Auth';
import { Loader2, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import HolographicLoader from './components/HolographicLoader';
import { getPartitionedKey } from './lib/utils';
import { ThemeLanguageProvider, useThemeLanguage } from './context/ThemeLanguageContext';
import { AuthProvider } from './context/AuthContext';


interface EBProps { children: React.ReactNode }
interface EBState { 
  hasError: boolean; 
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends React.Component<EBProps, EBState> {
  public state: EBState;
  public props: EBProps;

  constructor(props: EBProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error: Error) { 
    return { hasError: true, error, errorInfo: null }; 
  }
  
  componentDidCatch(error: Error, errorInfo: any) { 
    console.error("Uncaught error captured by boundary:", error, errorInfo); 
  }

  handleRestart = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030107] flex flex-col items-center justify-center text-white p-6 text-center relative overflow-hidden select-none font-sans">
          {/* Neon accent shapes */}
          <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(139,92,246,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.15)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          <div className="max-w-lg p-8 rounded-3xl bg-slate-900/40 backdrop-blur-3xl border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.15)] space-y-6 relative">
            {/* Holographic brackets inside error container */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500/40" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500/40" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500/40" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500/40" />

            <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-4">
              {/* Indonesian Warning */}
              <div>
                <h1 className="text-lg font-black uppercase tracking-wider text-red-400">
                  Terjadi kesalahan saat memuat halaman.
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-bold">
                  Sistem mendeteksi inkonsistensi data atau crash runtime saat merender antarmuka.
                </p>
              </div>

              {/* English Warning */}
              <div className="pt-3 border-t border-slate-800/60">
                <h1 className="text-sm font-black uppercase tracking-wider text-violet-300">
                  Something went wrong while loading the page.
                </h1>
                <p className="text-[11px] text-slate-400 mt-1 font-bold">
                  The framework detected data inconsistencies or a layout renderer failure.
                </p>
              </div>
            </div>

            {/* Error detail console block */}
            {this.state.error && (
              <div className="p-3 bg-black/50 border border-red-500/15 rounded-xl text-left font-mono text-[9px] text-red-300/80 max-h-32 overflow-y-auto custom-scrollbar">
                <span className="font-black text-red-400 uppercase">[X] FATAL_EXCEPTION: </span>
                {this.state.error.message || String(this.state.error)}
                {this.state.error.stack && (
                  <pre className="mt-1 opacity-55 leading-relaxed text-[8px] whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleRestart}
                className="w-full py-3.5 px-4 rounded-xl bg-violet-600/25 hover:bg-violet-600/40 border border-violet-500/35 font-black text-xs tracking-widest text-violet-200 uppercase duration-200 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.15)]"
              >
                <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
                <span>Reload Page</span>
              </button>
              
              <button
                onClick={this.handleResetState}
                className="w-full py-3.5 px-4 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 hover:border-red-500/50 font-black text-xs tracking-widest text-red-200 uppercase duration-200 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                title="Clears all local storage variables to fix schema mismatches"
              >
                <Database size={14} />
                <span>Reset Offline Cache</span>
              </button>
            </div>

            <p className="text-[9px] font-mono tracking-widest text-slate-500 text-center uppercase">
              RECONSTRUCTION PROTOCOL SEC_v2.06
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ThemeAwareApp({
  currentView,
  setCurrentView,
  hasBusiness,
  setHasBusiness,
}: {
  currentView: string;
  setCurrentView: (view: any) => void;
  hasBusiness: boolean;
  setHasBusiness: (val: boolean) => void;
}) {
  const { storeTheme, language } = useThemeLanguage();

  const getThemeBGClass = () => {
    switch (storeTheme) {
      case 'clean_white':
        return 'bg-slate-50 text-slate-800 font-sans';
      case 'gold_luxury':
        return 'bg-neutral-980 text-amber-100 font-sans';
      case 'blue_fintech':
        return 'bg-[#020917] text-sky-100 font-sans';
      case 'purple_hologram':
        return 'bg-[#080211] text-fuchsia-100 font-sans';
      case 'cyber_neon':
      default:
        return 'bg-[#050208] text-white font-sans';
    }
  };

  return (
    <div key={language} className={`min-h-screen ${getThemeBGClass()} relative overflow-hidden transition-all duration-700`}>
      {/* Ambient Mesh Gradients based on theme */}
      {storeTheme === 'cyber_neon' && (
        <>
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#7c3aed] rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute bottom-[-50px] right-[-50px] w-[400px] h-[400px] bg-[#db2777] rounded-full blur-[100px] opacity-20"></div>
        </>
      )}
      {storeTheme === 'purple_hologram' && (
        <>
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#d946ef] rounded-full blur-[130px] opacity-25"></div>
          <div className="absolute bottom-[-50px] right-[-50px] w-[400px] h-[400px] bg-[#8b5cf6] rounded-full blur-[110px] opacity-20"></div>
        </>
      )}
      {storeTheme === 'blue_fintech' && (
        <>
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#0ea5e9] rounded-full blur-[130px] opacity-20"></div>
          <div className="absolute bottom-[-50px] right-[-50px] w-[400px] h-[400px] bg-[#2563eb] rounded-full blur-[110px] opacity-20"></div>
        </>
      )}
      {storeTheme === 'gold_luxury' && (
        <>
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#eab308] rounded-full blur-[140px] opacity-10"></div>
          <div className="absolute bottom-[-50px] right-[-50px] w-[400px] h-[400px] bg-[#b45309] rounded-full blur-[120px] opacity-10"></div>
        </>
      )}
      {storeTheme === 'clean_white' && (
        <>
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#cbd5e1] rounded-full blur-[130px] opacity-35"></div>
          <div className="absolute bottom-[-50px] right-[-50px] w-[400px] h-[400px] bg-[#e2e8f0] rounded-full blur-[110px] opacity-30"></div>
        </>
      )}
      
      <div className="relative z-10 h-full">
        {currentView === 'splash' && <開啓動畫 onComplete={() => setCurrentView('landing')} />}
        {currentView === 'landing' && <LandingPage onNavigate={setCurrentView} />}
        {currentView === 'auth' && <Auth onNavigate={setCurrentView} />}
        {(currentView === 'dashboard' || currentView === 'products' || currentView === 'attendance' || currentView === 'kasir' || currentView === 'wallet' || currentView === 'profile') && (
           <>
             {!hasBusiness && <OnboardingPopup onComplete={() => setHasBusiness(true)} />}
             <DashboardPage currentView={currentView} onNavigate={setCurrentView} />
           </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<'splash' | 'landing' | 'auth' | 'dashboard' | 'products' | 'attendance' | 'kasir' | 'wallet' | 'profile'>('splash');
  const [hasBusiness, setHasBusiness] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Inactivity timeout (e.g., 15 minutes)
  const INACTIVITY_LIMIT = 15 * 60 * 1000;

  const handleLogout = useCallback(() => {
    signOut(auth).then(() => {
      setCurrentView('splash');
    }).catch(console.error);
  }, []);

  useEffect(() => {
    let timeoutId: any;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (user) {
        timeoutId = setTimeout(() => {
          handleLogout();
        }, INACTIVITY_LIMIT);
      }
    };

    if (user) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('scroll', resetTimer);
      window.addEventListener('click', resetTimer);
      resetTimer(); // Initialize timer
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [user, handleLogout, INACTIVITY_LIMIT]);

  const currentViewRef = useRef(currentView);
  useEffect(() => { currentViewRef.current = currentView; }, [currentView]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      const v = currentViewRef.current;
      const isOfflineLoggedIn = localStorage.getItem('offline_logged_in_user');
      
      // Route protection logic
      if ((currentUser || isOfflineLoggedIn) && (v === 'landing' || v === 'auth' || v === 'splash')) {
        setCurrentView('dashboard');
      } else if (!currentUser && !isOfflineLoggedIn && v !== 'landing' && v !== 'splash') {
        setCurrentView('auth');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const businessKey = getPartitionedKey('inmarket_business', true);
    const businessData = localStorage.getItem(businessKey);
    if (businessData) {
      setHasBusiness(true);
    }
  }, []);

  if (authLoading && currentView !== 'splash') {
    return <HolographicLoader />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeLanguageProvider>
          <ThemeAwareApp
            currentView={currentView}
            setCurrentView={setCurrentView}
            hasBusiness={hasBusiness}
            setHasBusiness={setHasBusiness}
          />
        </ThemeLanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
