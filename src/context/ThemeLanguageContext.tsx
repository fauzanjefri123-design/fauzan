import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/translations';

type Theme = 'light' | 'dark';
type Language = 'id' | 'en';
export type StoreTheme = 'cyber_neon' | 'clean_white' | 'gold_luxury' | 'blue_fintech' | 'purple_hologram';

type ThemeLanguageContextType = {
  theme: Theme;
  language: Language;
  storeTheme: StoreTheme;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  setStoreTheme: (theme: StoreTheme) => void;
  t: (key: string) => string;
};

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(undefined);

export const ThemeLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) return savedTheme;
    
    // Time-based default: 18:00 - 05:59 is dark
    const hour = new Date().getHours();
    return (hour >= 18 || hour < 6) ? 'dark' : 'light';
  });
  
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'id';
  });

  const [storeTheme, setStoreThemeState] = useState<StoreTheme>(() => {
    return (localStorage.getItem('store_theme') as StoreTheme) || 'cyber_neon';
  });

  // Translation function
  const t = (key: string): string => {
    const dict = translations[language] || translations.id;
    return dict[key] || key;
  };

  useEffect(() => {
    // If store theme is active, let's manage standard dark/light class mapping
    const isLightMode = storeTheme === 'clean_white';
    setTheme(isLightMode ? 'light' : 'dark');
    document.documentElement.classList.toggle('dark', !isLightMode);
  }, [storeTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('store_theme', storeTheme);
  }, [storeTheme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setStoreTheme = (newTheme: StoreTheme) => {
    setStoreThemeState(newTheme);
  };

  return (
    <ThemeLanguageContext.Provider value={{ theme, language, storeTheme, toggleTheme, setLanguage, setStoreTheme, t }}>
      {children}
    </ThemeLanguageContext.Provider>
  );
};

export const useThemeLanguage = () => {
  const context = useContext(ThemeLanguageContext);
  if (!context) throw new Error('useThemeLanguage must be used within ThemeLanguageProvider');
  return context;
};

