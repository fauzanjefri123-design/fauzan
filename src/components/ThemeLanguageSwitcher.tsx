import React from 'react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { Sun, Moon, Languages, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ThemeLanguageSwitcher() {
  const { theme, toggleTheme, language, setLanguage, t } = useThemeLanguage();

  return (
    <div className="flex items-center gap-3 p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden group">
      {/* Subtle scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_0%,rgba(168,85,247,0.05)_50%,transparent_100%)] bg-[length:100%_4px] animate-[pulse_3s_infinite]" />
      
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="relative p-2.5 rounded-xl transition-all duration-300 group/btn overflow-hidden"
        title={t('toggleTheme') || 'Switch Appearance'}
      >
        <div className={`absolute inset-0 transition-opacity duration-500 ${theme === 'dark' ? 'bg-violet-600/20' : 'bg-amber-500/10'}`} />
        <div className="relative z-10">
          {theme === 'dark' ? (
            <Moon size={18} className="text-violet-400 group-hover/btn:rotate-12 transition-transform" />
          ) : (
            <Sun size={18} className="text-amber-400 group-hover/btn:rotate-90 transition-transform" />
          )}
        </div>
      </button>

      {/* Vertical Divider */}
      <div className="w-[1px] h-4 bg-white/10" />

      {/* Language Slider/Toggle */}
      <div className="relative flex items-center bg-black/50 p-1 rounded-xl border border-white/5">
        <motion.div 
          layout
          className="absolute h-full top-0 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_0_15px_rgba(139,92,246,0.4)]"
          initial={false}
          animate={{
            left: language === 'id' ? 0 : '50%',
            width: '50%'
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        
        <button 
          onClick={() => setLanguage('id')}
          className={`relative z-10 px-3 py-1.5 text-[10px] font-black tracking-widest transition-colors duration-300 flex items-center gap-1.5 ${language === 'id' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <span>🇮🇩</span>
          <span>ID</span>
        </button>

        <button 
          onClick={() => setLanguage('en')}
          className={`relative z-10 px-3 py-1.5 text-[10px] font-black tracking-widest transition-colors duration-300 flex items-center gap-1.5 ${language === 'en' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <span>🇺🇸</span>
          <span>EN</span>
        </button>
      </div>

      <div className="hidden lg:flex items-center gap-1 px-2">
        <Zap size={10} className="text-cyan-400 animate-pulse" />
        <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-tighter uppercase whitespace-nowrap">
          {language === 'id' ? 'SISTEM SIAP' : 'SYSTEM READY'}
        </span>
      </div>
    </div>
  );
}
