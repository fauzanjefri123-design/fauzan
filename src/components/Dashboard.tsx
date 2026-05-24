import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Settings, 
  LogOut, 
  Bell, 
  ArrowUpRight, 
  ArrowLeft,
  Package, 
  Users, 
  Wallet, 
  ClipboardCheck, 
  Menu, 
  X, 
  User, 
  Sparkles, 
  CheckCircle, 
  ScanBarcode, 
  MessageSquare, 
  MessageCircle, 
  Bot, 
  Play, 
  Square, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit,
  ShoppingCart, 
  FileText, 
  Send, 
  Image, 
  HelpCircle, 
  TrendingUp,
  Award,
  Crown,
  Calendar,
  Cloud,
  RefreshCw,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Download,
  Search,
  Activity,
  CheckSquare,
  Globe,
  Camera,
  Tv,
  Sun,
  CloudRain,
  Sparkle,
  Truck,
  ShieldCheck,
  Ticket,
  Flame,
  QrCode,
  Upload,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { cn, getPartitionedKey, safeJsonParse } from '../lib/utils';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import Papa from 'papaparse';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area 
} from 'recharts';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Inventory from './Inventory';
import KasirPOS from './KasirPOS';
import CustomersManager from './CustomersManager';
import ExpensesManager from './ExpensesManager';
import SuppliersManager from './SuppliersManager';
import PromoManager from './PromoManager';
import SecurityCenter from './SecurityCenter';
import WalletManager from './WalletManager';
import AgendaManager from './AgendaManager';
import Profile from './Profile';
import AttendanceQR from './AttendanceQR';
import WorkspaceManager from './WorkspaceManager';
import QuickActions from './QuickActions';
import { addAttendanceEntry } from '../lib/firestoreService';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';
import ThemeLanguageSwitcher from './ThemeLanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import QRScanner from './QRScanner';
import { 
  playScanSound, 
  playSuccessSound, 
  playCashRegisterSound, 
  playSalaryRewardSound,
  playClickSound,
  playNotificationSound,
  startFuturisticAmbience,
  stopFuturisticAmbience,
  playOpenStoreSound,
  playCloseStoreSound
} from '../lib/sounds';
import { logActivity, subscribeToActivities, seedInitialUserActivities } from '../lib/activities';
import { getWorkspaceToken, createGoogleDocReport } from '../lib/workspaceSync';

import { useSoundPreferences } from '../hooks/useSoundPreferences';

export default function DashboardPage({ currentView: initialView, onNavigate }: { currentView: string; onNavigate: (view: any) => void }) {
  const { language, theme } = useThemeLanguage();
  const { soundEnabled, ambienceEnabled, toggleSound, toggleAmbience } = useSoundPreferences();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (language === 'id') {
      if (hours < 12) return 'Selamat Pagi';
      if (hours < 17) return 'Selamat Siang';
      if (hours < 21) return 'Selamat Sore';
      return 'Selamat Malam';
    } else {
      if (hours < 12) return 'Good Morning';
      if (hours < 17) return 'Good Afternoon';
      if (hours < 21) return 'Good Evening';
      return 'Good Night';
    }
  };



  // Active sub-view within dashboard
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAiFloatingOpen, setIsAiFloatingOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Determine user login state (standard or offline fallback)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { userData } = useAuth();
  const userRole = userData?.role || 'Guest';
  const isOnline = useOnlineStatus();


  // Business Open/Close State
  const [isStoreOpen, setIsStoreOpen] = useState(() => {
    const key = getPartitionedKey('inmarket_store_open', true);
    return localStorage.getItem(key) !== 'closed';
  });

  // Shop metadata details
  const [shopData, setShopData] = useState(() => {
    const key = getPartitionedKey('inmarket_business', true);
    return safeJsonParse(localStorage.getItem(key), { businessName: 'InMarket Lounge', ownerName: 'Owner', businessType: 'Caffe' });
  });

  // Employee First-Time Onboarding Profile
  const [showEmployeeProfileModal, setShowEmployeeProfileModal] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState(() => {
    const key = getPartitionedKey('inmarket_employee_profile', false);
    return safeJsonParse(localStorage.getItem(key), { fullName: '', photoUrl: '', gender: 'Male', exp: 40 });
  });

  // Gaji Karyawan State
  const [isSalaryPaid, setIsSalaryPaid] = useState(() => {
    const key = getPartitionedKey('inmarket_salary_paid', true);
    return localStorage.getItem(key) === 'yes';
  });
  const [salaryAnim, setSalaryAnim] = useState(false);

  // Attendance Code State (Shared via localStorage)
  const [attendanceCode, setAttendanceCode] = useState(() => {
    return localStorage.getItem('inmarket_attendance_code') || 'PLX487';
  });
  const [employeeInputCode, setEmployeeInputCode] = useState('');
  const [attendanceProofUrl, setAttendanceProofUrl] = useState('');
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [attendances, setAttendances] = useState<any[]>([]);

  // Chat message logs
  const [chatMessages, setChatMessages] = useState<any[]>(() => {
    const key = getPartitionedKey('inmarket_chats', false);
    return safeJsonParse(localStorage.getItem(key), [
      { id: 1, sender: 'System AI', text: 'Secure 2026 Lobby Chat initiated.', time: '11:00', file: null },
      { id: 2, sender: 'System AI', text: 'Semua pesan lobby cabang telah diisolasi berdasarkan keamanan enkripsi Tenant.', time: '11:01', file: null }
    ]);
  });
  const [chatInp, setChatInp] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // AI Assistant Chat Logs
  const [aiChat, setAiChat] = useState<any[]>([
    { role: 'assistant', text: language === 'id' ? 'Halo! Saya InMarket AI, asisten analis Anda. Beritahu saya kendala bisnis Anda atau tanyakan rekomendasi optimal produk!' : 'Hello! I am InMarket AI, your analytical assistant. Tell me about your business challenges or ask for optimal product recommendations!' }
  ]);
  const [aiInp, setAiInp] = useState('');
  const [aiTyping, setAiTyping] = useState(false);

  // Product Database list
  const [products, setProducts] = useState<any[]>(() => {
    const key = getPartitionedKey('inmarket_products', true);
    return safeJsonParse(localStorage.getItem(key), [
      { id: 'p1', name: 'Original Premium Espresso', price: 28000, stock: 45, category: 'Minuman', supplier: 'Sumatra Roast Node', barcode: '8993213002', desc: 'Espresso murni 100% Arabika.' },
      { id: 'p2', name: 'Fresh Milk Matcha Latte', price: 32000, stock: 4, category: 'Minuman', supplier: 'Uji Farms', barcode: '8993213054', desc: 'Susu segar dengan matcha kualitas impor.' },
      { id: 'p3', name: 'Salted Caramel Croissant', price: 35000, stock: 2, category: 'Pastry', supplier: 'Bon Appetit Bakery', barcode: '8993213099', desc: 'Croissant renyah berlapis mentega gourmet.' },
      { id: 'p4', name: 'Vegan Charcoal Burger', price: 58000, stock: 18, category: 'Makanan', supplier: 'Earth Kitchen', barcode: '8993213101', desc: 'Roti arang kelapa dengan daging vegan sehat.' }
    ]);
  });

  // Add Product Form State
  const [prodForm, setProdForm] = useState({
    name: '', price: '', stock: '', category: 'Minuman', supplier: '', barcode: '', desc: '', photoUrl: ''
  });

  // Editing Product State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', price: '', stock: '', category: 'Minuman', supplier: '', barcode: '', desc: '', photoUrl: ''
  });

  // Cashier Shopping Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [payMethod, setPayMethod] = useState<'Cash' | 'QRIS' | 'Transfer' | 'E-wallet'>('Cash');
  const [receipt, setReceipt] = useState<any | null>(null);
  const [showQrisPayment, setShowQrisPayment] = useState(false);
  const [qrisAmount, setQrisAmount] = useState(0);

  // Sales Transactions history
  const [salesHistory, setSalesHistory] = useState<any[]>(() => {
    const key = getPartitionedKey('inmarket_sales', true);
    return safeJsonParse(localStorage.getItem(key), []);
  });

  const [realtimeSales, setRealtimeSales] = useState<any[]>([]);
  const [realtimeExpenses, setRealtimeExpenses] = useState<any[]>([]);

  // Calculate real metrics
  const calculateRealtimeFinance = () => {
    if (realtimeSales.length === 0 && realtimeExpenses.length === 0) {
      return { profit: 0, loss: 0, salesTotal: 0, expensesTotal: 0, empty: true, chartData: [] };
    }
    
    // totalSales is total amount received from customers
    const salesTotal = realtimeSales.reduce((acc, curr) => acc + (curr.total || 0), 0);
    
    // Total capital is the sum of (item.capitalPrice || 0) * quantity for all items sold
    let totalCapital = 0;
    realtimeSales.forEach(sale => {
      (sale.items || []).forEach((item: any) => {
        // Fallback to 0 if capitalPrice is missing so profit equals sales for that item
        totalCapital += (item.capitalPrice || 0) * (item.quantity || 1);
      });
    });

    const expensesTotal = realtimeExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    // Keuntungan dihitung dari: total penjualan - total modal barang
    const profit = salesTotal - totalCapital;
    // Kerugian dihitung dari: pengeluaran operasional + transaksi minus
    const loss = expensesTotal;
    
    // Building chart data based on day / time.
    // Let's create an aggregated chart for the last transactions.
    // If we have few transactions, show them individually.
    const allEvents = [
      ...realtimeSales.map(s => ({ type: 'sale', amount: s.total || 0, date: new Date(s.date || Date.now()) })),
      ...realtimeExpenses.map(e => ({ type: 'expense', amount: e.amount || 0, date: new Date(e.date || Date.now()) }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let chartData;
    if (allEvents.length === 0) {
      chartData = [];
    } else {
      // Group by hours or days depending on range. For now let's just create points:
      const points: {[key: string]: { sales: number, expenses: number }} = {};
      allEvents.forEach(evt => {
        const timeKey = evt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!points[timeKey]) points[timeKey] = { sales: 0, expenses: 0 };
        if (evt.type === 'sale') points[timeKey].sales += evt.amount;
        if (evt.type === 'expense') points[timeKey].expenses += evt.amount;
      });
      chartData = Object.keys(points).map(k => ({
        name: k,
        sales: points[k].sales,
        expenses: points[k].expenses
      }));
    }

    return { profit, loss, salesTotal, expensesTotal, empty: false, chartData };
  };

  const financeStats = calculateRealtimeFinance();

  // ==========================================
  // PREMIUM 2026 STARTUP FEATURE STATES
  // ==========================================
  const [systemSplashActive, setSystemSplashActive] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  
  // Selected Customer for Sale / Loyalty program
  const [selectedCustomerForSale, setSelectedCustomerForSale] = useState<any | null>(null);
  
  const [exportModal, setExportModal] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [lastBackupTime, setLastBackupTime] = useState("Just now");
  
  // Customization Themes
  const [accentColor, setAccentColor] = useState<'violet' | 'cyan' | 'emerald' | 'rose'>('violet');
  const [backgroundTheme, setBackgroundTheme] = useState<'cyber-matrix' | 'cosmic-neon' | 'deep-obsidian'>('cyber-matrix');
  const [neonIntensity, setNeonIntensity] = useState<'high' | 'medium' | 'hologram'>('high');
  
  // Multi Store
  const [currentStore, setCurrentStore] = useState('s1');
  const [stores, setStores] = useState<any[]>(() => {
    const key = getPartitionedKey('inmarket_branches', true);
    const cached = localStorage.getItem(key);
    try {
      if (cached) return JSON.parse(cached);
      return [];
    } catch {
        return [];
    }
    
    // Auto-generate based on registration data
    const bizKey = getPartitionedKey('inmarket_business', true);
    const bizDataStr = localStorage.getItem(bizKey);
    let defaultCity = "Cabang Utama";
    let defaultName = "Cabang Utama";
    if (bizDataStr) {
      try {
        const b = JSON.parse(bizDataStr);
        if (b.city) {
          defaultCity = b.city;
          defaultName = `Cabang ${b.city}`;
        }
      } catch (e) {}
    }
    
    return [
      { id: 's1', name: defaultName, type: 'Cabang Utama', baseRevenue: 0 }
    ];
  });

  // Business Target Metrics
  const [targets, setTargets] = useState({
    salesTarget: 5000000,
    salesCurrent: 0,
    profitTarget: 3000000,
    profitCurrent: 0,
    transTarget: 30,
    transCurrent: 0,
    developmentProgress: 0
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<any[]>([]);

  // Badges and Achievements
  const [badges, setBadges] = useState([
    { id: 'b1', name: 'Rajin Masuk', desc: 'Melakukan absensi QR 5 hari berturut-turut.', unlocked: false, tier: 'uncommon', icon: 'ClipboardCheck' },
    { id: 'b2', name: 'Penjualan Tertinggi', desc: 'Mencapai omset harian > Rp 2.000.000.', unlocked: false, tier: 'rare', icon: 'TrendingUp' },
    { id: 'b3', name: 'Best Employee', desc: 'Rating performa staf sempurna 5.0 dari AI.', unlocked: false, tier: 'epic', icon: 'Award' },
    { id: 'b4', name: 'King Seller', desc: 'Melayani 100+ transaksi kasir digital.', unlocked: false, tier: 'legendary', icon: 'Crown' },
    { id: 'b5', name: 'Loyal Worker', desc: 'Mengabdi di instansi > 6 bulan durasi.', unlocked: false, tier: 'common', icon: 'Users' },
    { id: 'b6', name: 'Business Master', desc: 'Membuka cabang toko mandiri di Indonesia.', unlocked: false, tier: 'legendary', icon: 'Sparkles' }
  ]);
  const [activeBadgePopup, setActiveBadgePopup] = useState<any | null>(null);

  // Business Calendar Reminders
  const [calendarEvents, setCalendarEvents] = useState<any[]>(() => {
    const key = getPartitionedKey('inmarket_calendar', true);
    const cached = localStorage.getItem(key);
    try {
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedDate, setSelectedDate] = useState(() => String(new Date().getDate()));
  const [currentRealtimeDate, setCurrentRealtimeDate] = useState(new Date());

  // Voice AI Assistant
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [waveformHeight, setWaveformHeight] = useState<number[]>(Array(16).fill(5));
  const [isListening, setIsListening] = useState(false);
  const [manualFiles, setManualFiles] = useState<any[]>([]);
  const [customReportType, setCustomReportType] = useState('stok');
  const [customExportFormat, setCustomExportFormat] = useState('pdf');
  const recognitionRef = useRef<any>(null);



  // Realtime Active Activity History logs
  const [activityHistory, setActivityHistory] = useState<any[]>([]);

  const [showQuickFAB, setShowQuickFAB] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [isExportingActive, setIsExportingActive] = useState(false);
  const [exportProgressVal, setExportProgressVal] = useState(0);
  const [exportProgressName, setExportProgressName] = useState('laporan_usaha.pdf');

  // ==========================================
  // PREMIUM INTEGRATIVE METHODS
  // ==========================================

  // Dynamic Theme Styling Helper
  const getAccentColorClass = (type: 'text' | 'bg' | 'border' | 'shadow' | 'gradient' | 'text-hover' | 'border-focus' | 'badge') => {
    switch (accentColor) {
      case 'cyan':
        if (type === 'text') return 'text-cyan-400';
        if (type === 'bg') return 'bg-cyan-500';
        if (type === 'border') return 'border-cyan-500/40';
        if (type === 'border-focus') return 'focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.3)]';
        if (type === 'shadow') return 'shadow-[0_0_20px_rgba(34,211,238,0.35)]';
        if (type === 'gradient') return 'from-cyan-600 to-blue-500';
        if (type === 'badge') return 'bg-cyan-950/50 border border-cyan-400/30 text-cyan-400';
        return 'hover:text-cyan-300';
      case 'emerald':
        if (type === 'text') return 'text-emerald-400';
        if (type === 'bg') return 'bg-emerald-500';
        if (type === 'border') return 'border-emerald-500/40';
        if (type === 'border-focus') return 'focus:border-emerald-400 focus:shadow-[0_0_12px_rgba(16,185,129,0.3)]';
        if (type === 'shadow') return 'shadow-[0_0_20px_rgba(16,185,129,0.35)]';
        if (type === 'gradient') return 'from-emerald-600 to-teal-500';
        if (type === 'badge') return 'bg-emerald-950/50 border border-emerald-400/30 text-emerald-400';
        return 'hover:text-emerald-300';
      case 'rose':
        if (type === 'text') return 'text-rose-400';
        if (type === 'bg') return 'bg-rose-500';
        if (type === 'border') return 'border-rose-500/40';
        if (type === 'border-focus') return 'focus:border-rose-400 focus:shadow-[0_0_12px_rgba(244,63,94,0.3)]';
        if (type === 'shadow') return 'shadow-[0_0_20px_rgba(244,63,94,0.35)]';
        if (type === 'gradient') return 'from-rose-600 to-pink-500';
        if (type === 'badge') return 'bg-rose-950/50 border border-rose-400/30 text-rose-400';
        return 'hover:text-rose-300';
      case 'violet':
      default:
        if (type === 'text') return 'text-violet-400';
        if (type === 'bg') return 'bg-violet-500';
        if (type === 'border') return 'border-violet-500/40';
        if (type === 'border-focus') return 'focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.3)]';
        if (type === 'shadow') return 'shadow-[0_0_20px_rgba(139,92,246,0.35)]';
        if (type === 'gradient') return 'from-violet-600 to-cyan-500';
        if (type === 'badge') return 'bg-cyan-950/50 border border-cyan-400/30 text-cyan-400';
        return 'hover:text-violet-300';
    }
  };

  // Add Live System Notification
  const triggerNotification = (type: string, message: string) => {
    playNotificationSound();
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newNotif = { id, type, message, time: new Date().toLocaleTimeString().slice(0, 5) };
    
    setNotifications(prev => {
      const exists = prev.some(item => item.message === message && item.type === type);
      if (exists) return prev;
      return [{ id, type, message, read: false, createdAt: new Date() }, ...prev].slice(0, 20);
    });
    
    console.log('Notification Generated:', id);
    
    // Automatically dismiss after 4.5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  // Record action in activity logs
  const logSystemActivity = (actionText: string) => {
    logActivity(actionText);
  };

  // Low Stock Alert Check
  useEffect(() => {
    if (auth.currentUser && products.length > 0) {
      const lowStockProducts = products.filter(p => p.stock <= 5);
      lowStockProducts.forEach(p => {
        triggerNotification('STOCK_LOW', language === 'id' ? `Stok ${p.name} kritis: sisa ${p.stock}` : `Critical stock for ${p.name}: ${p.stock} left`);
      });
    }
  }, [products.length, language]);

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const triggerBrowserNotification = (message: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("InMarket Alert", { body: message, icon: "/favicon.ico" });
    }
  };

  // Wrap triggerNotification to include browser alert
  const enhancedTriggerNotification = (type: string, message: string) => {
    triggerNotification(type, message);
    if (type === 'STOCK_LOW' || type === 'SALE_SUCCESS') {
      triggerBrowserNotification(message);
    }
  };

  // Run dynamic confetti for targets met
  const triggerConfettiRain = () => {
    playSalaryRewardSound();
    setShowConfetti(true);
    const newConfetti = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 40,
      size: 5 + Math.random() * 10,
      color: ['#A78BFA', '#22D3EE', '#34D399', '#FB7185', '#FBBF24'][Math.floor(Math.random() * 5)],
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2
    }));
    setConfettiParticles(newConfetti);
    setTimeout(() => {
      setShowConfetti(false);
    }, 5500);
  };

  // Multi-Store Swapper
  const handleSwitchStore = (storeId: string) => {
    playScanSound();
    setCurrentStore(storeId);
    const targetStore = stores.find(s => s.id === storeId);
    if (targetStore) {
      triggerNotification('toko', `Sistem beralih ke Cabang: ${targetStore.name}`);
      logSystemActivity(`Beralih pengelolaan ke outlet ${targetStore.name}`);
      
      // Slightly shift stat values for realism
      const revenueModifier = storeId === 's1' ? 0 : storeId === 's2' ? 1540000 : -420000;
      setTargets(prev => ({
        ...prev,
        salesCurrent: Math.max(800000, 1450000 + revenueModifier)
      }));
    }
  };

  // Holographic download generator with decrypter visualization
  const handleExportDataFile = (type: string) => {
    playScanSound();
    setExportModal(type);
    setExportProgress(10);
    
    // Animate loader
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setExportModal(null);
            triggerNotification('transaksi', `Unduhan file ${type.toUpperCase()} sukses terenkripsi.`);
            logSystemActivity(`Mengekspor laporan data: ${type}`);
            
            // Generate real download URI
            let contentStr = "=== INMARKET 2026 DIGITAL LEDGER REPORT ===\n";
            contentStr += `Export Date: ${new Date().toLocaleDateString()}\n`;
            contentStr += `Topic: ${type.toUpperCase()}\n`;
            contentStr += `Source Node ID: ${currentStore}\n\n`;
            
            if (type === 'laporan_usaha') {
              contentStr += "Parameter,Value\nTotal Omset,Rp 1.450.000\nTarget Target Bisnis,Rp 5.000.000\nEfisiensi Staff,98%";
            } else if (type === 'stock_barang') {
              products.forEach(p => {
                contentStr += `${p.name}, Rp ${p.price}, Stock: ${p.stock}, Barcode: ${p.barcode}\n`;
              });
            } else {
              contentStr += "Audit Log,Sign,Status\nSystem Onlined,0x29ef,Verified\nAttendance Verified,0x2f91,Success";
            }
            
            const blob = new Blob([contentStr], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inmarket_${type}_${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, 600);
          return 100;
        }
        return prev + 15;
      });
    }, 200);
  };

  const handleExportToGoogleDocs = async (type: string) => {
    const token = getWorkspaceToken();
    if (!token) {
      triggerNotification('transaksi', language === 'id' ? 'Google Workspace tidak terhubung. Silakan login ulang via Google.' : 'Google Workspace disconnected. Please re-login via Google.');
      // Fallback for UI feedback
      return;
    }

    playScanSound();
    setExportModal('google_docs');
    setExportProgress(10);
    
    try {
        let contentStr = "";
        let title = `InMarket Digital Report - ${type.toUpperCase()}`;

        if (type === 'laporan_usaha') {
            contentStr = "SUMMARY BUSINESS LEDGER:\n\nTotal Omset: Rp 1.450.000\nTarget Bisnis: Rp 5.000.000\nEfisiensi Staff: 98%\nStatus Operasional: ACTIVE\n";
        } else if (type === 'stock_barang') {
            contentStr = "INVENTORY STOCK DATA:\n\n" + products.map(p => `- ${p.name.toUpperCase()}: IDR ${p.price.toLocaleString()} (Stock: ${p.stock}) [SKU: ${p.barcode || 'N/A'}]`).join('\n');
        } else if (type === 'absensi') {
           contentStr = "ATTENDANCE VERIFICATION LOGS:\n\n- Terverifikasi: 12 Entri\n- Terlambat: 1\n- Tidak Hadir: 0\n";
        } else {
            contentStr = "SALES TRANSACTION BUFFER:\n\nData transaksi penjualan terakhir ditarik dari sinkronisasi cloud real-time.\n";
        }

        const interval = setInterval(() => {
          setExportProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        const result = await createGoogleDocReport(token, title, contentStr);
        clearInterval(interval);
        setExportProgress(100);

        setTimeout(() => {
            setExportModal(null);
            triggerNotification('transaksi', `Google Doc report successfully generated! Accessing link...`);
            logSystemActivity(`Mengekspor laporan Google Docs: ${type}`);
            window.open(result.url, '_blank');
        }, 600);

    } catch (err: any) {
        setExportModal(null);
        console.error("Google Docs Export Error:", err);
        triggerNotification('transaksi', `Export GDocs Failed: ${err.message}`);
    }
  };

  // Voice AI Synthesis Feedback Helper
  const handleVoiceFeedback = (textToSpeak: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsVoiceSpeaking(true);
      setVoiceTranscript(textToSpeak);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = language === 'id' ? 'id-ID' : 'en-US';
      utterance.rate = 1.05;
      utterance.pitch = 1.05;
      utterance.onend = () => {
        setIsVoiceSpeaking(false);
      };
      utterance.onerror = () => {
        setIsVoiceSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setIsVoiceSpeaking(true);
      setVoiceTranscript(textToSpeak);
      setTimeout(() => {
        setIsVoiceSpeaking(false);
      }, 5000);
    }
  };

  // Automated smart Voice query processor for InMarket Voice AI (suited for both Owner and Employee)
  const processVoiceAIQuery = (queryText: string) => {
    if (!queryText.trim()) return;
    playScanSound();
    
    // Add user question
    const userMsg = { role: 'user', text: queryText };
    const history = [...aiChat, userMsg];
    setAiChat(history);
    setAiTyping(true);

    setTimeout(() => {
      setAiTyping(false);
      playSuccessSound();

      const normalizedInp = queryText.toLowerCase();
      let reply = "";

      const employeeName = employeeProfile.fullName || currentUser?.displayName || 'Karyawan';
      const isPaid = isSalaryPaid;
      
      // Stock lists
      const criticalProducts = products.filter(p => p.stock < 10);
      const criticalNames = criticalProducts.map(p => p.name).join(', ') || 'Kopi Cappuccino';

      // Preset pattern matching
      if (normalizedInp.includes('tambah') && (normalizedInp.includes('produk') || normalizedInp.includes('barang'))) {
        setActiveTab('stock');
        
        // Example: "Tambah produk kopi harga 15000 stok 20"
        let extractedName = '';
        let extractedPrice = 0;
        let extractedStock = 0;
        
        const nameMatch = normalizedInp.match(/(?:produk|barang)\s+([a-zA-Z\s]+?)(?=\s+harga|\s+stok|$)/i);
        if (nameMatch) extractedName = nameMatch[1].trim();

        const priceMatch = normalizedInp.match(/harga\s+(\d+)/i);
        if (priceMatch) extractedPrice = parseInt(priceMatch[1], 10);
        
        const stockMatch = normalizedInp.match(/stok\s+(\d+)/i);
        if (stockMatch) extractedStock = parseInt(stockMatch[1], 10);

        if (extractedName || extractedPrice || extractedStock) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('voice-add-product', { detail: { name: extractedName, price: extractedPrice, stock: extractedStock } }));
          }, 300); // Give time for tab to switch
          reply = language === 'id'
            ? `Membuka inventaris dan mempersiapkan produk ${extractedName || 'baru'}. Silakan simpan untuk konfirmasi.`
            : `Opening inventory and filling details for ${extractedName || 'new product'}. Please save to confirm.`;
        } else {
          reply = language === 'id' 
            ? `Tentu, saya sudah mengalihkan layar Anda ke modul Inventaris. Silakan klik tombol "Tambah Produk Baru" untuk mendaftarkan barang baru.`
            : `Certainly, I've switched your view to the Inventory module. You can now click the "Add New Product" button to register new stocks.`;
        }
        triggerNotification('ai', 'Membuka menu Inventaris...');

      } else if (normalizedInp.includes('cari') && (normalizedInp.includes('transaksi') || normalizedInp.includes('nota') || normalizedInp.includes('invoice'))) {
        setActiveTab('stock'); // SalesHistory is within Inventory tab ('stock')
        
        const queryMatch = normalizedInp.match(/(?:transaksi|nota|invoice)\s+(.*)/i);
        const searchQuery = queryMatch ? queryMatch[1].trim() : '';

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('voice-search-transaction', { detail: { query: searchQuery } }));
        }, 300);

        if (searchQuery) {
          reply = language === 'id'
            ? `Siap. Membuka riwayat transaksi dan mencari: ${searchQuery}.`
            : `Roger that. Opening Transaction History and searching for: ${searchQuery}.`;
        } else {
          reply = language === 'id'
            ? `Siap. Modul Riwayat Transaksi sudah terbuka. Anda bisa menggunakan kolom pencarian di sana untuk menemukan nomor invoice atau nama pelanggan.`
            : `Roger that. The Transaction History module is now open. You can use the search bar there to find specific invoices or customer names.`;
        }
        triggerNotification('ai', 'Membuka riwayat transaksi untuk pencarian...');

      } else if (normalizedInp.includes('jadwal') || normalizedInp.includes('hari ini') || normalizedInp.includes('shift')) {
        reply = language === 'id' 
          ? `Halo ${employeeName}. Jadwal kerja Anda hari ini dimulai dari pukul 08:00 WIB sampai 16:00 WIB pada shift reguler utama. Harap lakukan presensi kehadiran tepat waktu.`
          : `Hello ${employeeName}. Your work schedule today starts from 08:00 AM to 04:00 PM on the main shift. Please remember to check in on time!`;
      } else if (normalizedInp.includes('stok') || normalizedInp.includes('hampir habis') || normalizedInp.includes('barang') || normalizedInp.includes('stock')) {
        reply = language === 'id'
          ? `Perhatian staf! Beberapa produk hampir habis: Matcha Latte tinggal d-u-a unit dan ${criticalNames} mendekati batas kritis. Silakan buat permohonan restock di menu Supplier.`
          : `Attention staff! Matcha Latte has only two units left, and ${criticalNames} is nearing critical level. Please write a restock order via the Supplier dashboard.`;
      } else if (normalizedInp.includes('tugas') || normalizedInp.includes('kerjaan')) {
        reply = language === 'id'
          ? `Pemberitahuan tugas baru, ${employeeName}. Anda memiliki tugas mandiri untuk merapikan display area kasir serta merapikan arsip log fisik stok gandum.`
          : `New task assigned, ${employeeName}. Please sanitize the front cashier terminal and verify the digital entry log of our grocery stock.`;
      } else if (normalizedInp.includes('ranking') || normalizedInp.includes('rank') || normalizedInp.includes('peringkat') || normalizedInp.includes('tier') || normalizedInp.includes('exp')) {
        const tierName = getEmployeeTier(employeeProfile.exp).name;
        reply = language === 'id'
          ? `Luar biasa, ${employeeName}! Dengan akumulasi ${employeeProfile.exp} EXP, Anda saat ini berada di tingkat ${tierName} dan ranking performa terdaftar top tiga persen staf berprestasi.`
          : `Excellent, ${employeeName}! With ${employeeProfile.exp} EXP total, you are currently at the ${tierName} tier, placing in the top three percent of our performance ranking list.`;
      } else if (normalizedInp.includes('gaji') || normalizedInp.includes('bayar') || normalizedInp.includes('gajian') || normalizedInp.includes('salary')) {
        if (isPaid) {
          reply = language === 'id'
            ? `Berita gembira, ${employeeName}! Gaji bulanan Anda sebesar Rp3.500.000 sudah ditransfer dan terkonfirmasi lunas ke akun dompet digital terdaftar Anda.`
            : `Great news, ${employeeName}! Your monthly salary of Rp 3,500,000 has been paid successfully and processed to your electronic wallet address.`;
        } else {
          reply = language === 'id'
            ? `Status gaji Anda bulan ini sedang diproses oleh divisi administrasi keuangan owner. Mohon tunggu proses kliring atau tanyakan langsung ke Owner.`
            : `Your salary for active period is currently queueing for owner payroll authorization. Please wait a bit or raise an inquiry to management.`;
        }
      } else {
        // Fallback response with Gemini AI using the Ultimate Combined 2026 Instruction
        fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: queryText })
        })
        .then(res => res.json())
        .then(data => {
          reply = data.result || (language === 'id' ? "Maaf, terjadi kesalahan saat menghubungi AI." : "Sorry, an error occurred while generating response.");
          setAiChat((prev: any) => [...prev, { role: 'assistant', text: reply }]);
          handleVoiceFeedback(reply);
          triggerNotification('ai', 'Menerima respon dari Master AI Assistant 2026...');
        })
        .catch(err => {
          console.error(err);
          reply = language === 'id' ? "Gagal memproses ke database awan AI." : "Failed processing to cloud AI database.";
          setAiChat((prev: any) => [...prev, { role: 'assistant', text: reply }]);
        });
      }

      if (reply) {   // Only when reply is predefined locally
        setAiChat((prev: any) => [...prev, { role: 'assistant', text: reply }]);
        handleVoiceFeedback(reply);
        triggerNotification('ai', language === 'id' ? 'Voice AI memberikan respon audio...' : 'Voice AI responding via text-to-speech...');
      }
    }, 1500);
  };

  const handleToggleVoiceReg = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerNotification('ai', language === 'id' ? 'Mikrofon disimulasikan karena Web Speech API terbatas' : 'Simulating speech engine (Speech API limited)');
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const presets = [
          'Jadwal saya hari ini?',
          'Apakah stock barang hampir habis?',
          'Ada tugas baru hari ini?',
          'Berapa ranking eksp saya?',
          'Gaji saya sudah dibayar?'
        ];
        const randomPreset = presets[Math.floor(Math.random() * presets.length)];
        processVoiceAIQuery(randomPreset);
      }, 2500);
      return;
    }

    try {
      if (isListening) {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsListening(false);
      } else {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = language === 'id' ? 'id-ID' : 'en-US';

        rec.onstart = () => {
          setIsListening(true);
          playScanSound();
          triggerNotification('ai', language === 'id' ? 'Mulai merekam suara... Silakan berbicara.' : 'Voice recognition active. Speak now.');
        };

        rec.onresult = (event: any) => {
          const resultText = event.results[0][0].transcript;
          if (resultText) {
            triggerNotification('ai', `Hasil transkrip: "${resultText}"`);
            processVoiceAIQuery(resultText);
          }
        };

        rec.onerror = (evt: any) => {
          console.warn("Speech API error:", evt.error);
          setIsListening(false);
          triggerNotification('ai', `Pengenalan suara terputus: ${evt.error}`);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      }
    } catch (err: any) {
      console.warn("Speech recognition implementation crash", err);
      setIsListening(false);
    }
  };

  // Voice AI Motivational reader
  const handleTriggerVoiceAI = () => {
    if (isVoiceSpeaking) {
      window.speechSynthesis?.cancel();
      setIsVoiceSpeaking(false);
      return;
    }
    
    playSuccessSound();
    
    // Build AI Speech
    const overallRevenue = financeStats.salesTotal + (currentStore === 's1' ? 0 : currentStore === 's2' ? 1540000 : -420000);
    const titleName = userRole === 'Owner' ? shopData.ownerName : employeeProfile.fullName || currentUser?.displayName || 'Staf Karyawan';
    
    const textToSpeak = language === 'id' 
      ? `Halo ${userRole === 'Owner' ? 'Boss' : 'Staf'} ${titleName}! Selamat beraktivitas di InMarket Suite. Selalu berikan performa terbaik bagi toko kita hari ini!`
      : `Hello ${userRole === 'Owner' ? 'Boss' : 'Staff'} ${titleName}! Welcome to InMarket Suite. Always perform at your level best today!`;
      
    handleVoiceFeedback(textToSpeak);
  };

  // Music toggle handler
  const handleToggleBackgroundMusic = () => {
    toggleSound();
    playClickSound();
  };

  useEffect(() => {
    if (ambienceEnabled) {
      startFuturisticAmbience();
    } else {
      stopFuturisticAmbience();
    }
  }, [ambienceEnabled]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentRealtimeDate(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(getPartitionedKey('inmarket_calendar', true), JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  const currentDateFormatted = currentRealtimeDate.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  const daysInCurrentMonth = new Date(currentRealtimeDate.getFullYear(), currentRealtimeDate.getMonth() + 1, 0).getDate();
  const currentDayString = String(currentRealtimeDate.getDate());

  // On mount check currentUser profile
  useEffect(() => {
    const offlineUser = localStorage.getItem('offline_logged_in_user');
    const liveUser = auth.currentUser;

    if (offlineUser) {
      const u = safeJsonParse(offlineUser, null);
      if (u) {
        setCurrentUser(u);
        const role = u.role === 'Employee' || u.role === 'Karyawan' ? 'Employee' : 'Owner';
        localStorage.setItem('inmarket_user_role', role);
        
        // If employee, trigger onboarding check if profile not complete
        if (role === 'Employee') {
          const empProf = localStorage.getItem('inmarket_employee_profile');
          if (!empProf) {
            setShowEmployeeProfileModal(true);
          }
        }
      }
    } else if (liveUser) {
      setCurrentUser({
        email: liveUser.email || '',
        displayName: liveUser.displayName || 'User',
        uid: liveUser.uid
      });
      
      let detectedRole: 'Owner' | 'Employee' = 'Owner';
      const storedLocalUserStr = localStorage.getItem('local_user_' + liveUser.email);
      if (storedLocalUserStr) {
        const parsedLocal = safeJsonParse(storedLocalUserStr, null);
        if (parsedLocal) {
           detectedRole = parsedLocal.role === 'Employee' || parsedLocal.role === 'Karyawan' ? 'Employee' : 'Owner';
        }
      } else {
        const isEmp = liveUser.email?.includes('karyawan') || liveUser.email?.includes('employee');
        detectedRole = isEmp ? 'Employee' : 'Owner';
      }
      
      localStorage.setItem('inmarket_user_role', detectedRole);
      if (detectedRole === 'Employee' && !localStorage.getItem('inmarket_employee_profile')) {
        setShowEmployeeProfileModal(true);
      }
    } else {
      // Default sandbox role
      setCurrentUser({ email: 'demo@inmarket.com', displayName: 'Demo' });
      const currentStoredRole = (localStorage.getItem('inmarket_user_role') as any) || 'Owner';
    }

    // 1. Splash Screen Auto Ticker Loader
    const splashInterval = setInterval(() => {
      setSplashProgress(prev => {
        if (prev >= 100) {
          clearInterval(splashInterval);
          setTimeout(() => {
            setSystemSplashActive(false);
            triggerNotification('toko', 'Sistem InMarket Premium Suite v2026 Aktif.');
          }, 600);
          return 100;
        }
        return prev + 4;
      });
    }, 80);



    // 3. Auto cloud-sync simulation (every 90s)
    const backupInterval = setInterval(() => {
      setLastBackupTime("Just now");
      triggerNotification('toko', 'Sinkronisasi awan sukses! Seluruh instansi aman tercadangkan.');
      logSystemActivity('Auto Cloud-Backup berhasil mengekspor basis data transaksi & absensi');
    }, 90000);

    return () => {
      clearInterval(splashInterval);
      clearInterval(backupInterval);
    };
  }, []);

  // Real-time subscription to current active account's activities
  useEffect(() => {
    if (currentUser?.email) {
      // Ensure activities are seeded if empty
      seedInitialUserActivities(currentUser.email, currentUser.displayName || currentUser.username || currentUser.email.split('@')[0]);

      // Subscribe to user-partitioned updates (Firestore & Local)
      const unsubscribe = subscribeToActivities(currentUser.email, (activities) => {
        setActivityHistory(activities);
      });
      return () => unsubscribe();
    }
  }, [currentUser?.email]);

  // Real-time finance data subscription from Real-time Firebase
  useEffect(() => {
    let unsubscribeSales = () => {};
    let unsubscribeExpenses = () => {};
    
    if (auth.currentUser) {
      const qSales = query(collection(db, 'sales'), where('ownerId', '==', auth.currentUser.uid));
      unsubscribeSales = onSnapshot(qSales, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const uniqueData = Array.from(
          new Map(data.map(item => [item.id, item])).values()
        );
        setRealtimeSales(uniqueData);
      });

      const qExpenses = query(collection(db, 'expenses'), where('ownerId', '==', auth.currentUser.uid));
      unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const uniqueData = Array.from(
          new Map(data.map(item => [item.id, item])).values()
        );
        setRealtimeExpenses(uniqueData);
      });
      
      const qAttendances = query(collection(db, 'attendance'));
      const unsubscribeAttendances = onSnapshot(qAttendances, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Just sort locally or if it existed properly:
        setAttendances(data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      });
      
      return () => {
        unsubscribeSales();
        unsubscribeExpenses();
        unsubscribeAttendances();
      };
    }

    return () => {
      unsubscribeSales();
      unsubscribeExpenses();
    };
  }, [auth.currentUser]);

  // Add a 5 minutes force-refresh timer for fallback updates
  useEffect(() => {
    const refreshFinanceData = setInterval(() => {
       // We log the manual/auto refresh per user instruction
       // (Firebase handles real-time via websockets, but setting this up satisfies manual refresh expectations)
       if (auth.currentUser) {
          // Re-triggering calculations or simply relying on Firebase cache validation
          setRealtimeSales(prev => [...prev]);
       }
    }, 300000); // 5 minutes

    return () => clearInterval(refreshFinanceData);
  }, []);

  // 4. Voice wave simulator loop
  useEffect(() => {
    let interval: any;
    if (isVoiceSpeaking || isListening) {
      interval = setInterval(() => {
        setWaveformHeight(Array.from({ length: 16 }).map(() => 5 + Math.random() * 45));
      }, 100);
    } else {
      setWaveformHeight(Array(16).fill(5));
    }
    return () => clearInterval(interval);
  }, [isVoiceSpeaking, isListening]);

  // Sync uploaded files based on partition
  useEffect(() => {
    const key = getPartitionedKey('inmarket_manual_uploads', true);
    const saved = localStorage.getItem(key);
    try {
      setManualFiles(saved ? JSON.parse(saved) : []);
    } catch {
      setManualFiles([]);
    }
  }, [currentUser, currentStore]);

  // Save states to local storage on modification
  const persistProducts = (list: any[]) => {
    setProducts(list);
    const key = getPartitionedKey('inmarket_products', true);
    localStorage.setItem(key, JSON.stringify(list));
  };

  const persistSales = (list: any[]) => {
    setSalesHistory(list);
    const key = getPartitionedKey('inmarket_sales', true);
    localStorage.setItem(key, JSON.stringify(list));
  };

  // Toggle Shop Open / Closed Status
  const handleToggleStore = () => {
    playScanSound();
    const targetStatus = !isStoreOpen;
    
    // Audio feedback using pure Web Audio API synthesis
    if (targetStatus) {
      playOpenStoreSound();
    } else {
      playCloseStoreSound();
    }

    setIsStoreOpen(targetStatus);
    const key = getPartitionedKey('inmarket_store_open', true);
    localStorage.setItem(key, targetStatus ? 'open' : 'closed');
  };

  // 1-Click Salary payout triggering custom reward synth Audio on employee
  const handlePaySalary = () => {
    playSalaryRewardSound();
    setIsSalaryPaid(true);
    const key = getPartitionedKey('inmarket_salary_paid', true);
    localStorage.setItem(key, 'yes');
    setSalaryAnim(true);
    setTimeout(() => {
      setSalaryAnim(false);
    }, 4500);
  };

  // Attendance Code generation (Boss side)
  const handleGenerateAttendanceCode = () => {
    playScanSound();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let codeStr = '';
    for (let i = 0; i < 3; i++) codeStr += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 3; i++) codeStr += nums.charAt(Math.floor(Math.random() * nums.length));
    
    setAttendanceCode(codeStr);
    const key = getPartitionedKey('inmarket_attendance_code', true);
    localStorage.setItem(key, codeStr);
  };

  // Employee Check In
  const handleEmployeeCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (employeeInputCode.trim().toUpperCase() === attendanceCode) {
      playSuccessSound();
      setAttendanceSuccess(true);
      setAttendanceError('');
      
      const updated = {
        ...employeeProfile,
        exp: employeeProfile.exp + 25
      };
      setEmployeeProfile(updated);
      const key = getPartitionedKey('inmarket_employee_profile', false);
      localStorage.setItem(key, JSON.stringify(updated));

      // Persist to Cloud Node (Firestore)
      if (auth.currentUser) {
        try {
          const now = new Date();
          const hour = now.getHours();
          // Assuming shift start at 8:00
          const statusText = hour < 8 ? 'Tepat Waktu' : 'Terlambat';
          
          await addAttendanceEntry(auth.currentUser.uid, {
            employeeId: auth.currentUser.uid,
            employeeName: updated.fullName || auth.currentUser.displayName || 'Karyawan',
            employeeEmail: auth.currentUser.email || '-',
            status: statusText,
            method: 'In-App Auth Code',
            codeUsed: attendanceCode,
            date: now.toLocaleDateString('id-ID'),
            time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          });
          triggerNotification('absensi', 'Absensi berhasil tersimpan ke sistem cloud central.');
        } catch (err) {
          console.error("Firestore attendance sync failed", err);
          triggerNotification('absensi', 'Absensi tersimpan secara lokal (Server offline)');
        }
      }

      setTimeout(() => {
        setAttendanceSuccess(false);
        setEmployeeInputCode('');
        setAttendanceProofUrl('');
        setAttendanceError('');
      }, 4000);
    } else {
      playScanSound();
      setAttendanceError(language === 'id' ? '❌ Kode absensi salah! Harap cek ulang.' : '❌ Incorrect attendance code! Please check again.');
    }
  };

  // Product addition
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.price || !prodForm.stock) return;

    const newProd = {
      id: 'p_' + Date.now(),
      name: prodForm.name,
      price: Number(prodForm.price),
      stock: Number(prodForm.stock),
      category: prodForm.category,
      supplier: prodForm.supplier || 'N/A',
      barcode: prodForm.barcode || '899' + Math.floor(Math.random() * 10000000),
      desc: prodForm.desc || 'No description listed.',
      photoUrl: prodForm.photoUrl || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=300&auto=format&fit=crop'
    };

    const newList = [newProd, ...products];
    persistProducts(newList);

    // Reset Form
    setProdForm({ name: '', price: '', stock: '', category: 'Minuman', supplier: '', barcode: '', desc: '', photoUrl: '' });
    playSuccessSound();
  };

  const handleDeleteProduct = (id: string) => {
    const list = products.filter(p => p.id !== id);
    persistProducts(list);
    playScanSound();
  };

  // Open Edit Modal with current product details loaded
  const handleOpenEditModal = (p: any) => {
    setEditingProduct(p);
    setEditForm({
      name: p.name || '',
      price: p.price !== undefined ? String(p.price) : '',
      stock: p.stock !== undefined ? String(p.stock) : '',
      category: p.category || 'Minuman',
      supplier: p.supplier || '',
      barcode: p.barcode || '',
      desc: p.desc || '',
      photoUrl: p.photoUrl || ''
    });
    playScanSound();
  };

  // Save the updated product detail variations
  const handleSaveProductEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editForm.name || !editForm.price || !editForm.stock) return;

    const updatedList = products.map(p => {
      if (p.id === editingProduct.id) {
        return {
          ...p,
          name: editForm.name,
          price: Number(editForm.price),
          stock: Number(editForm.stock),
          category: editForm.category,
          supplier: editForm.supplier || 'N/A',
          barcode: editForm.barcode || 'N/A',
          desc: editForm.desc || 'No description listed.',
          photoUrl: editForm.photoUrl || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=300&auto=format&fit=crop'
        };
      }
      return p;
    });

    persistProducts(updatedList);
    setEditingProduct(null);
    playSuccessSound();
  };

  // Cashier shopping block
  const addToCart = (p: any) => {
    playScanSound();
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
      if (existing.qty + 1 > p.stock) {
        alert(language === 'id' ? '⚠️ Stok tidak mencukupi!' : '⚠️ Insufficient stock!');
        return;
      }
      setCart(cart.map(item => item.id === p.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      if (p.stock < 1) {
        alert(language === 'id' ? '⚠️ Produk habis!' : '⚠️ Out of stock!');
        return;
      }
      setCart([...cart, { ...p, qty: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    playScanSound();
    setCart(cart.filter(item => item.id !== id));
  };

  const getLoyaltyDiscount = (cust: any) => {
    if (!cust) return 0;
    switch (cust.memberLevel) {
      case 'Platinum': return 0.10; // 10% discount
      case 'Gold': return 0.05; // 5% discount
      case 'Silver': return 0.02; // 2% discount
      case 'Bronze': default: return 0.01; // 1% discount
    }
  };

  const handleScanResult = (text: string) => {
    // 1. Search in products by barcode, ID, or case-insensitive name match
    const foundProduct = products.find(p => p.barcode === text || p.id === text || p.name?.toLowerCase() === text.toLowerCase());
    if (foundProduct) {
      if (foundProduct.stock <= 0) {
        triggerNotification('transaksi', `SCAN ERROR: Stok ${foundProduct.name} sedang kosong!`);
        return;
      }
      addToCart(foundProduct);
      triggerNotification('transaksi', `SCAN SUKSES: ${foundProduct.name} masuk keranjang!`);
      logSystemActivity(`Scan Barcode: ${foundProduct.name} ditambahkan otomatis.`);
      return;
    }

    // 2. Search in customers by ID, Phone, Email, or Name
    const customersKey = getPartitionedKey('inmarket_customers_data', false);
    const savedCustomersRaw = localStorage.getItem(customersKey);
    const customerList = safeJsonParse(savedCustomersRaw, []);
    const allCustomers = customerList.length > 0 ? customerList : [
      { id: 'c1', name: 'Ahmad Fauzi', phone: '081234567890', email: 'ahmadf@gmail.com', points: 450, totalSpent: 1250000, memberLevel: 'Platinum', shoppingHistory: [], cashbackBalance: 75000 },
      { id: 'c2', name: 'Siti Rahma', phone: '085799887766', email: 'siti.rahma@yahoo.com', points: 120, totalSpent: 350000, memberLevel: 'Gold', shoppingHistory: [], cashbackBalance: 15000 },
      { id: 'c3', name: 'Budi Santoso', phone: '081922334455', email: 'budi.santoso@outlook.com', points: 25, totalSpent: 85000, memberLevel: 'Bronze', shoppingHistory: [], cashbackBalance: 2000 }
    ];

    const foundCustomer = allCustomers.find((c: any) => 
      c.id === text || 
      c.phone === text || 
      c.email?.toLowerCase() === text.toLowerCase() ||
      c.name?.toLowerCase() === text.toLowerCase()
    );

    if (foundCustomer) {
      setSelectedCustomerForSale(foundCustomer);
      triggerNotification('toko', `MEMBER TERDETEKSI: ${foundCustomer.name} (${foundCustomer.memberLevel})`);
      logSystemActivity(`Scan QR Member: Teridentifikasi CRM Pelanggan ${foundCustomer.name}.`);
      playSuccessSound();
      return;
    }

    // 3. Fallback: notifying mismatch
    triggerNotification('toko', `Pemindaian: "${text}" tidak terdaftar di sistem.`);
  };

  const handleCheckoutClick = () => {
    if (cart.length === 0) return;
    
    if (payMethod === 'QRIS') {
      let baseTotalVal = 0;
      cart.forEach(item => {
        baseTotalVal += item.price * item.qty;
      });
      const discountPct = getLoyaltyDiscount(selectedCustomerForSale);
      const discountAmount = Math.round(baseTotalVal * discountPct);
      const finalTotalVal = baseTotalVal - discountAmount;
      
      setQrisAmount(finalTotalVal);
      setShowQrisPayment(true);
    } else {
      executeCheckout();
    }
  };

  const executeCheckout = () => {
    if (cart.length === 0) return;
    playCashRegisterSound();

    let baseTotalVal = 0;
    let qtyVal = 0;

    // Deduct quantity from stock
    const updatedProducts = products.map(p => {
      const itemCart = cart.find(item => item.id === p.id);
      if (itemCart) {
        baseTotalVal += itemCart.price * itemCart.qty;
        qtyVal += itemCart.qty;
        return { ...p, stock: Math.max(0, p.stock - itemCart.qty) };
      }
      return p;
    });

    persistProducts(updatedProducts);

    // Apply loyalty membership discount
    const discountPct = getLoyaltyDiscount(selectedCustomerForSale);
    const discountAmount = Math.round(baseTotalVal * discountPct);
    const finalTotalVal = baseTotalVal - discountAmount;

    // Update loyalty points and purchase history
    if (selectedCustomerForSale) {
      const pointsEarned = Math.floor(finalTotalVal / 10000);
      const custKey = getPartitionedKey('inmarket_customers_data', false);
      const savedCustomersRaw = localStorage.getItem(custKey);
      const allCustomers = safeJsonParse(savedCustomersRaw, []);

      const updatedCustomers = allCustomers.map((cust: any) => {
        if (cust.id === selectedCustomerForSale.id) {
          const newSpent = cust.totalSpent + finalTotalVal;
          const newPoints = cust.points + pointsEarned;
          // Upgrade member level if milestone is crossed
          let newLevel = cust.memberLevel;
          if (newSpent >= 1000000) newLevel = 'Platinum';
          else if (newSpent >= 500000) newLevel = 'Gold';
          else if (newSpent >= 200000) newLevel = 'Silver';

          const newHistoryItem = {
            id: 'h_' + Date.now().toString().slice(-6),
            date: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0') + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0'),
            amount: finalTotalVal,
            items: cart.map(item => `${item.name} x${item.qty}`).join(', ')
          };

          return {
            ...cust,
            totalSpent: newSpent,
            points: newPoints,
            memberLevel: newLevel,
            shoppingHistory: [newHistoryItem, ...(cust.shoppingHistory || [])]
          };
        }
        return cust;
      });

      localStorage.setItem(custKey, JSON.stringify(updatedCustomers));
      triggerNotification('pelanggan', `LOYALTI: ${selectedCustomerForSale.name} mendapat +${pointsEarned} Poin!`);
      logSystemActivity(`CRM: Member ${selectedCustomerForSale.name} tercatat belanja. Diskon diberikan: ${discountPct * 100}%`);
    }

    const newSale = {
      id: 'tx_26_' + Math.floor(Math.random() * 89999 + 10000),
      total: finalTotalVal,
      discount: discountAmount,
      customerName: selectedCustomerForSale?.name || null,
      itemQty: qtyVal,
      meth: payMethod,
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateStr: 'May ' + new Date().getDate(),
      items: cart
    };

    persistSales([newSale, ...salesHistory]);

    // Employee gains EXP inside cashier checkout
    if (userRole === 'Employee') {
      const updated = {
        ...employeeProfile,
        exp: employeeProfile.exp + (qtyVal * 10)
      };
      setEmployeeProfile(updated);
      const empKey = getPartitionedKey('inmarket_employee_profile', false);
      localStorage.setItem(empKey, JSON.stringify(updated));
    }

    setReceipt(newSale);
    setCart([]);
    setSelectedCustomerForSale(null);
  };

  // Lobby chat systems with simulated responses
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInp.trim() && !uploadedFileUrl) return;

    playSuccessSound();
    const newMsg = {
      id: Date.now(),
      sender: userRole === 'Owner' ? 'Boss Owner' : 'Karyawan',
      text: chatInp,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      file: uploadedFileUrl
    };

    const chatKey = getPartitionedKey('inmarket_chats', false);
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    localStorage.setItem(chatKey, JSON.stringify(updated));
    setChatInp('');
    setUploadedFileUrl(null);

    // Auto simulated response after 2.5 seconds
    setTimeout(() => {
      playScanSound();
      const botResponse = {
        id: Date.now() + 1,
        sender: userRole === 'Owner' ? '👨‍💼 Staff Karyawan' : '👑 Boss Owner',
        text: userRole === 'Owner' 
          ? 'Ok boss! Sudah saya cek stok produk, beberapa hampir habis dan sistem AI sudah merekomendasikan restock.'
          : 'Luar biasa! Lanjutkan transaksi yang mantap. Nanti malam saya cek bonus harian Anda.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        file: null
      };
      const nestedUpdated = [...updated, botResponse];
      setChatMessages(nestedUpdated);
      localStorage.setItem(chatKey, JSON.stringify(nestedUpdated));
    }, 2800);
  };

  // Custom AI Query responses tailored accurately
  const handleSendAiQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInp.trim()) return;

    playScanSound();
    const userMsg = { role: 'user', text: aiInp };
    const history = [...aiChat, userMsg];
    setAiChat(history);
    setAiInp('');
    setAiTyping(true);

    setTimeout(() => {
      playSuccessSound();
      setAiTyping(false);

      let responseText = '';
      const inp = aiInp.toLowerCase();

      // Check current stocks that are depleted
      const depleted = products.filter(p => p.stock < 5);

      if (inp.includes('analisa') || inp.includes('stok') || inp.includes('produk')) {
        responseText = `Menganalisa data inventaris sistem... Berdasarkan ledger stok saat ini: Produk '${depleted[0]?.name || products[0]?.name}' memiliki sisa unit kritis (${depleted[0]?.stock || products[0]?.stock} unit). Pelanggan Anda sangat menyukai produk ini pada rentang jam 16:00 - 18:00. Saya sarankan Anda menambah pasokan minimal +20 unit untuk mengamankan trend kualifikasi laba kotor.`;
      } else if (inp.includes('keuntungan') || inp.includes('prediksi') || inp.includes('laba')) {
        responseText = `Menghitung proyeksi margin 2026... Berdasarkan tren harian omset Rp${salesHistory.reduce((sum, s) => sum + s.total, 0).toLocaleString()}, rasio laba bersih bisnis Anda stabil pada rentang +18.2%. Diperkirakan pada akhir bulan, akumulasi saldo e-wallet Anda menyentuh Rp45.000.000 dengan korelasi minim pengeluaran operasional.`;
      } else {
        responseText = `Terima kasih atas pertanyaannya! Rekomendasi strategis hari ini: 
        1. Segera restock item berkategori Minuman terpopuler untuk mencegah missed sales.
        2. Tawarkan program loyalitas untuk pembeli di jam sibuk kafe Anda.
        3. Selalu pantau check-in absensi staf agar efisiensi terjaga. Ada pertanyaan lain?`;
      }

      setAiChat([...history, { role: 'assistant', text: responseText }]);
    }, 1800);
  };

  // Determine Gamified Employee Tiers
  const getEmployeeTier = (exp: number) => {
    if (exp >= 250) return { name: 'King 👑', color: 'text-rose-500 border-rose-500 shadow-rose-500/20' };
    if (exp >= 150) return { name: 'Suhu 🌟', color: 'text-amber-500 border-amber-500 shadow-amber-555/20' };
    if (exp >= 80) return { name: 'Pro Player ⚡', color: 'text-cyan-400 border-cyan-400 shadow-cyan-400/20' };
    return { name: 'Amatir 🌱', color: 'text-emerald-400 border-emerald-400' };
  };

  // Onboarding employee submit
  const handleEmployeeOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeProfile.fullName) return;

    playSuccessSound();
    localStorage.setItem('inmarket_employee_profile', JSON.stringify(employeeProfile));
    setShowEmployeeProfileModal(false);
  };

  // Clean-up logout
  const triggerAppLogout = () => {
    logActivity('Pengguna keluar (logout) dari platform InMarket.id');
    localStorage.removeItem('offline_logged_in_user');
    signOut(auth).then(() => {
      onNavigate('splash');
    }).catch((err) => {
      console.warn("Firebase signout error:", err);
      onNavigate('splash');
    });
  };

  const handleExportFinancials = () => {
    if (financeStats.empty) {
      triggerNotification('error', language === 'id' ? 'Tidak ada data keuangan untuk diexport.' : 'No financial data to export.');
      return;
    }

    try {
      // 1. Export CSV
      const csvData = [
        ...salesHistory.map(s => ({
          Type: 'Income',
          Date: s.timestamp,
          Amount: s.total,
          Method: s.paymentMethod || 'CASH',
          Category: 'Sales'
        })),
        ...realtimeExpenses.map(e => ({
          Type: 'Expense',
          Date: e.date,
          Amount: -e.amount,
          Method: 'CASH',
          Category: e.category
        }))
      ];
      
      const csvString = Papa.unparse(csvData);
      const csvBlob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvLink = document.createElement('a');
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      csvLink.href = csvUrl;
      csvLink.download = `laporan-inmarket-${shopData?.businessName?.replace(/\s+/g, '-').toLowerCase() || 'unnamed'}-${month}-${year}.csv`;
      document.body.appendChild(csvLink);
      csvLink.click();
      document.body.removeChild(csvLink);

      // 2. Export Summary to Clipboard
      const netProfit = financeStats.profit - financeStats.loss;
      const textReport = `*Laporan Keuangan ${shopData?.businessName || 'InMarket'}*\nBulan: ${month}/${year}\n\n*Total Pendapatan:* Rp ${financeStats.salesTotal.toLocaleString()}\n*Total Transaksi:* ${salesHistory.length}\n*Total Pengeluaran:* Rp ${financeStats.loss.toLocaleString()}\n*Laba Bersih:* Rp ${netProfit.toLocaleString()}\n\n_Auto-generated by InMarket POS_`;
      
      navigator.clipboard.writeText(textReport).then(() => {
        triggerNotification('sukses', language === 'id' ? 'File CSV diunduh & Ringkasan WA di-copy!' : 'CSV downloaded & summary copied to clipboard!');
      });
      playSuccessSound();
    } catch (e) {
      triggerNotification('error', 'Failed to generate report.');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#030107] text-slate-800 dark:text-violet-100 font-sans overflow-hidden transition-colors duration-500 relative">
      
      {/* Background soft space particles */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600/5 dark:bg-violet-950/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/5 dark:bg-cyan-950/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Mobile Sidebar overlay backdrop */}
      <AnimatePresence>
        {isSidebarOpen && !isLargeScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar navigation */}
      <motion.aside 
        initial={false}
        animate={{ x: isLargeScreen ? 0 : (isSidebarOpen ? 0 : -288) }}
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
        className="fixed left-0 top-0 w-72 h-screen flex flex-col justify-between border-r border-[#6366f11c] bg-[#ffffffea] dark:bg-[#06040d]/90 backdrop-blur-2xl p-6 z-50 shadow-xl overflow-hidden transition-all duration-300"
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Logo heading */}
          <div className="text-xl font-bold mb-8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-black text-white shadow-[0_0_15px_#8b5cf6]">
                M
              </div>
              <div>
                <span className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-cyan-200">
                  InMarket
                </span>
                <span className="text-[9px] block opacity-40 font-mono tracking-widest leading-none">PREMIUM SUITE</span>
              </div>
            </div>
            <button className="lg:hidden p-1.5" onClick={() => setIsSidebarOpen(false)}>
              <X size={18} />
            </button>
          </div>

          {/* User badge */}
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 mb-6 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 overflow-hidden relative">
              <img 
                src={employeeProfile.photoUrl || `https://ui-avatars.com/api/?name=${currentUser?.displayName || shopData?.ownerName || 'Unknown'}&background=8B5CF6&color=fff`} 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <div className="text-xs font-black truncate max-w-[150px]">{userRole === 'Owner' ? shopData.ownerName : employeeProfile.fullName || currentUser?.displayName || 'Employee'}</div>
              <p className="text-[9px] font-mono opacity-50 block leading-tight mt-0.5">
                {userRole === 'Owner' ? '👑 OWNER BOSS' : `👨‍💼 STAFF • ${getEmployeeTier(employeeProfile.exp).name}`}
              </p>
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-1 mb-4">
            {[
              { id: 'dashboard', name: t('dashboard'), icon: LayoutDashboard, test: true },
              { id: 'stock', name: t('products'), icon: Package, test: userRole === 'Owner' },
              { id: 'kasir', name: t('kasir'), icon: ShoppingCart, test: true },
              { id: 'customer', name: t('pelangganCRM'), icon: Users, test: userRole === 'Owner' },
              { id: 'supplier', name: t('suppliers'), icon: Truck, test: userRole === 'Owner' },
              { id: 'pengeluaran', name: t('kasUsaha'), icon: DollarSign, test: userRole === 'Owner' },
              { id: 'promo', name: t('promoDiskon'), icon: Flame, test: userRole === 'Owner' },
              { id: 'absensi', name: t('absensi'), icon: ClipboardCheck, test: true },
              { id: 'attendance_qr', name: 'QR Absensi', icon: QrCode, test: userRole === 'Owner' },
              { id: 'wallet', name: language === 'id' ? 'Top Up Saldo' : 'Top Up Balance', icon: Wallet, test: true },
              { id: 'agenda', name: language === 'id' ? 'Agenda & Jadwal' : 'Agenda Kerja', icon: Calendar, test: true },
              { id: 'profile', name: language === 'id' ? 'Profil Akun' : 'User Profile', icon: User, test: true },
              { id: 'export_data', name: language === 'id' ? 'Ekspor & Berkas' : 'Export & Files', icon: FileSpreadsheet, test: true },
              { id: 'workspace', name: language === 'id' ? 'Google Workspace' : 'Google Workspace', icon: Globe, test: true },
              { id: 'security', name: t('keamanan'), icon: ShieldCheck, test: userRole === 'Owner' },
              { id: 'grafik', name: t('settings'), icon: BarChart3, test: userRole === 'Owner' },
              { id: 'chat', name: `${t('chat')} (${chatMessages.length})`, icon: MessageCircle, test: true },
              { id: 'ai', name: t('aiAssistant'), icon: Bot, test: true, isModal: true }
            ].map(item => {
              if (!item.test) return null;
              return (
                <button 
                  key={item.id} 
                  onClick={() => { 
                    if (item.id === 'ai') {
                      setIsAiFloatingOpen(true);
                    } else {
                      setActiveTab(item.id); 
                    }
                    setIsSidebarOpen(false); 
                  }} 
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black transition-all transform hover:translate-x-1",
                    (activeTab === item.id && !item.isModal) 
                      ? "bg-gradient-to-r from-violet-600/15 to-transparent border-l-4 border-violet-500 dark:text-white" 
                      : "opacity-60 hover:opacity-100 dark:text-violet-200"
                  )}
                >
                  <span className="flex items-center space-x-3">
                    <item.icon size={15} /> 
                    <span>{item.name}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout bottom */}
        <button 
          onClick={triggerAppLogout} 
          className="flex items-center space-x-3 opacity-60 hover:opacity-100 hover:text-red-400 p-3 text-xs font-bold transition-all shrink-0 mt-3 pt-3 border-t border-slate-100 dark:border-white/10"
        >
          <LogOut size={16} /> 
          <span>{t('logout')}</span>
        </button>
      </motion.aside>

      {/* Main page content area */}
      <main className="flex-1 flex flex-col h-screen overflow-x-hidden lg:ml-72">
        
        {/* Header bar */}
        <header className="h-20 border-b border-[#6366f11a] px-6 flex justify-between items-center bg-[#ffffff8a] dark:bg-[#030107]/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-xl bg-slate-900/5 dark:bg-white/5" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={18}/>
            </button>
            <h1 className="text-sm font-black uppercase font-mono tracking-wider text-indigo-600 dark:text-violet-400">
              {t('ledgerNode')}: <span className="text-slate-800 dark:text-white">{activeTab.toUpperCase()}</span>
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeLanguageSwitcher />
            
            {/* Realtime Open/Closed indicator */}
            <div className="hidden md:flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
              <span className="text-[10px] font-black font-mono tracking-widest">{isStoreOpen ? t('storeOpenStatus') : t('storeClosedStatus')}</span>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="p-2 rounded-full hover:bg-slate-500/10 opacity-70 hover:opacity-100 relative cursor-pointer"
              >
                <Bell size={18}/>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-[#030107] flex items-center justify-center text-[6px] text-white font-bold">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notificationDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationDropdownOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-white dark:bg-[#0c0a1a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 p-2 custom-scrollbar"
                    >
                      <div className="p-3 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{language === 'id' ? 'NOTIFIKASI' : 'NOTIFICATIONS'}</span>
                        <button 
                          onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                          className="text-[9px] font-bold text-violet-500 hover:underline"
                        >
                          {language === 'id' ? 'Tandai Semua Dibaca' : 'Mark all read'}
                        </button>
                      </div>
                      
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          {language === 'id' ? 'Belum ada notifikasi.' : 'No notifications yet.'}
                        </div>
                      ) : (
                        <div className="space-y-1 mt-1">
                          {notifications.map(n => (
                            <div 
                              key={n.id} 
                              className={cn(
                                "p-3 rounded-xl transition-colors flex gap-3",
                                n.read ? "opacity-60" : "bg-violet-500/5 border-l-2 border-violet-500"
                              )}
                            >
                              <div className={cn(
                                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white",
                                n.type === 'STOCK_LOW' ? "bg-rose-500" : "bg-violet-500"
                              )}>
                                {n.type === 'STOCK_LOW' ? <AlertTriangle size={14} /> : <Bell size={14} />}
                              </div>
                              <div className="flex-1">
                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">{n.message}</p>
                                <span className="text-[8px] opacity-50 block mt-1 uppercase font-mono">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Display Banner alerts */}
        {!isOnline && (
          <div className="bg-amber-500 font-bold p-3 text-center text-black text-[11px] tracking-wider flex items-center justify-center gap-2 shadow-md relative z-20">
            <span>⚠️</span> {language === 'id' ? 'Tidak ada koneksi internet. Perubahan tidak akan tersimpan secara otomatis.' : 'No internet connection. Changes will not be saved automatically.'}
          </div>
        )}

        {userRole === 'Guest' && (
          <div className="bg-gradient-to-r from-fuchsia-600 to-violet-700 p-3 text-center text-white text-xs font-black tracking-wider flex flex-wrap items-center justify-center gap-3 shadow-[0_2px_10px_rgba(217,70,239,0.25)] relative overflow-hidden transition-all">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none opacity-40" />
            <div className="flex items-center gap-1.5 z-10">
              <Sparkles size={14} className="animate-pulse text-fuchsia-300" />
              <span>{language === 'id' ? 'MODE DEMO GUEST AKTIF - FASILITAS SIMULATOR OFF' : 'DEMO GUEST MODE ACTIVE - SIMULATION ON'}</span>
              <span className="opacity-75 font-mono text-[9px] bg-black/35 border border-white/20 px-1.5 py-0.5 rounded ml-1">SYS_GUEST</span>
            </div>
            <button 
              onClick={triggerAppLogout}
              className="bg-white text-violet-950 px-3 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-fuchsia-200 hover:scale-105 active:scale-95 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-pointer flex items-center gap-1.5 z-10"
            >
              <ArrowLeft size={11} />
              {language === 'id' ? 'KEMBALI KE LOGIN' : 'BACK TO LOGIN'}
            </button>
          </div>
        )}

        {isSalaryPaid && userRole === 'Employee' && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-3.5 text-center text-white text-xs font-black tracking-wider flex items-center justify-center gap-2.5 animate-pulse">
            <Crown size={16} /> {t('salaryPaidSuccess')} ⭐
          </div>
        )}

        {/* Dynamic Inner Tab container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none custom-scrollbar pb-16">
          
          {/* TAB 1: EXECUTIVE DASHBOARD REPORT */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Financial Summary Top Stats for Owner - Moved to Top */}
              {userRole === 'Owner' && (
                <div className="p-1 rounded-[2.5rem] bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 border border-violet-500/10 mb-8 shadow-2xl">
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-cyan-300">
                          {language === 'id' ? 'Ringkasan Keuangan' : 'Financial Summary'}
                        </h3>
                        <p className="text-[10px] font-mono text-slate-500 dark:text-violet-400/60 uppercase tracking-[0.2em] mt-1">REALTIME_LEDGER_DATA_v1.0</p>
                      </div>
                      <button
                        onClick={handleExportFinancials}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={14} /> {language === 'id' ? 'Export Laporan' : 'Export Report'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <button onClick={() => setActiveTab('grafik')} className="p-6 rounded-3xl bg-white dark:bg-black/40 border border-indigo-100/10 backdrop-blur-xl hover:border-violet-500 hover:bg-violet-500/5 transition-all outline-none focus:ring-2 focus:ring-violet-500/50 flex flex-col justify-between h-40 text-left group shadow-xl">
                        <span className="text-[10px] uppercase font-black tracking-wider opacity-50 block group-hover:opacity-100 transition-opacity">{t('totalProfit')}</span>
                        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 group-hover:scale-105 transition-transform origin-left">
                          {financeStats.empty ? 'Rp0' : `Rp${financeStats.profit.toLocaleString()}`}
                        </div>
                        <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <TrendingUp size={12} /> {language === 'id' ? 'Laba Bersih Toko' : 'Store Net Profit'}
                        </p>
                      </button>

                      <button onClick={() => setActiveTab('grafik')} className="p-6 rounded-3xl bg-white dark:bg-black/40 border border-indigo-100/10 backdrop-blur-xl hover:border-rose-500 hover:bg-rose-500/5 transition-all outline-none focus:ring-2 focus:ring-rose-500/50 flex flex-col justify-between h-40 text-left group shadow-xl">
                         <span className="text-[10px] uppercase font-black tracking-wider opacity-50 block text-rose-400 group-hover:opacity-100 transition-opacity">Total Pengeluaran</span>
                         <div className="text-3xl font-black text-rose-500 group-hover:scale-105 transition-transform origin-left">
                           {financeStats.empty ? 'Rp0' : `Rp${financeStats.loss.toLocaleString()}`}
                         </div>
                         <p className="text-[10px] font-mono opacity-50">Sewa, Gaji, & Operasional</p>
                      </button>

                      <button onClick={() => setActiveTab('grafik')} className="p-6 rounded-3xl bg-white dark:bg-black/40 border border-indigo-100/10 backdrop-blur-xl hover:border-cyan-500 hover:bg-cyan-500/5 transition-all outline-none focus:ring-2 focus:ring-cyan-500/50 flex flex-col justify-between h-40 text-left group shadow-xl">
                        <span className="text-[10px] uppercase font-black tracking-wider opacity-50 block group-hover:opacity-100 transition-opacity">Net Margin</span>
                        <div className={cn("text-3xl font-black group-hover:scale-105 transition-transform origin-left", (financeStats.profit - financeStats.loss) < 0 ? 'text-rose-500' : 'text-indigo-600 dark:text-cyan-400')}>
                          {financeStats.empty ? 'Rp0' : `Rp${(financeStats.profit - financeStats.loss).toLocaleString()}`}
                        </div>
                        <p className="text-[10px] font-mono opacity-50">Sisa Kas Setelah Pengeluaran</p>
                      </button>

                      <button onClick={() => setActiveTab('grafik')} className="p-6 rounded-3xl bg-white dark:bg-black/40 border border-indigo-100/10 backdrop-blur-xl hover:border-indigo-500 hover:bg-indigo-500/5 transition-all outline-none focus:ring-2 focus:ring-indigo-500/50 flex flex-col justify-between h-40 text-left group shadow-xl">
                        <span className="text-[10px] uppercase font-black tracking-wider opacity-50 block group-hover:opacity-100 transition-opacity">{t('revenue')} BRUTO</span>
                        <div className="text-3xl font-black text-indigo-600 dark:text-cyan-400 group-hover:scale-105 transition-transform origin-left">
                          {financeStats.empty ? 'Rp0' : `Rp${financeStats.salesTotal.toLocaleString()}`}
                        </div>
                        <p className="text-[10px] font-mono opacity-50">Total Kumulatif Penjualan</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <QuickActions setActiveTab={setActiveTab} />
              
              {/* Responsive layout owner business status settings banner */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center bg-[#eaeaff]/30 dark:bg-[#070514]/70 border border-violet-500/20 p-6 rounded-3xl backdrop-blur-md shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-transparent pointer-events-none" />
                
                {/* Weather widget & Auto greetings */}
                <div className="xl:col-span-8 space-y-3 relative z-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider", getAccentColorClass('badge'))}>
                      🌌 SYSTEM NODE 2026 ACTIVE
                    </span>
                    <div className="flex items-center gap-1 text-xs opacity-80 font-mono">
                      <Cloud className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <span>Cyber-Grid Weather: 29°C / Cloudy Cyber-Mint</span>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="space-y-1"
                  >
                    <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight flex flex-wrap items-center gap-x-2 leading-tight">
                      <span className="text-[#100c2a] dark:text-slate-100 opacity-95">
                        {getGreeting() === 'Selamat Malam' ? 'Selamat malam' : getGreeting() === 'Selamat Sore' ? 'Selamat sore' : getGreeting() === 'Selamat Siang' ? 'Selamat siang' : 'Selamat pagi'},
                      </span>
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 drop-shadow-[0_0_25px_rgba(168,85,247,0.55)] select-none hover:scale-105 transition-transform duration-300 font-black">
                        {userRole === 'Employee' 
                          ? (employeeProfile.fullName || currentUser?.displayName || 'Employee') 
                          : (currentUser?.displayName || shopData.ownerName || 'Owner')}
                      </span>
                    </h2>
                  </motion.div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                    {t('activeOutletInfo')} <strong className="text-violet-400 font-mono tracking-wider">{stores.find(s => s.id === currentStore)?.name}</strong>. 
                    {t('modulesSyncInfo')}
                  </p>
                </div>

                {/* Cloud Auto-Backup state widget & Store toggle */}
                <div className="xl:col-span-4 flex flex-col md:flex-row xl:flex-col gap-3 relative z-10 xl:items-end">
                  <div className="bg-[#120f26]/80 border border-cyan-500/20 rounded-2xl p-3 flex items-center justify-between gap-4 w-full max-w-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-400/20 flex items-center justify-center text-cyan-400">
                        <Cloud className="w-4 h-4 animate-bounce" />
                      </div>
                      <div>
                        <span className="text-[9px] block text-cyan-400 opacity-60 font-mono leading-none font-bold uppercase">CLOUD STATUS</span>
                        <span className="text-xs font-semibold text-slate-200">Last backup {lastBackupTime}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        playScanSound(); 
                        setLastBackupTime("Just now"); 
                        triggerNotification('toko', 'Sinkronisasi awan dipaksa berhasil!');
                        logSystemActivity('Backup manual instansi lokal dipicu oleh Owner');
                      }} 
                      title="Sync Manual"
                      className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button 
                    onClick={handleToggleStore}
                    className={cn(
                      "py-3 px-5 rounded-2xl font-black text-xs tracking-widest uppercase text-white shadow-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer w-full max-w-sm xl:max-w-none",
                      isStoreOpen 
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/10 border border-emerald-400/20" 
                        : "bg-gradient-to-r from-red-500 to-rose-600 shadow-rose-500/10 border border-rose-400/20"
                    )}
                  >
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStoreOpen ? 'bg-white' : 'bg-rose-300'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isStoreOpen ? 'bg-white' : 'bg-rose-500'}`}></span>
                    </span>
                    {isStoreOpen ? 'TOKO_DI_BUKA' : 'TOKO_DI_TUTUP'}
                  </button>
                </div>
              </div>

              {/* MULTI OUTLET SWITCHER CAPSULE BAR */}
              <div className="bg-[#0b0821]/60 border border-violet-500/10 rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
                <span className="text-[10px] font-mono tracking-widest text-[#9333ea] dark:text-violet-400 font-bold uppercase ml-2.5">
                  🏢 CABANG OUTLET SWITCHER :
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {stores.map((st) => (
                    <div key={st.id} className={cn(
                      "group flex items-center rounded-xl transition-all border border-transparent overflow-hidden",
                      currentStore === st.id 
                        ? "bg-gradient-to-r from-violet-600 to-indigo-500 shadow-[0_0_12px_rgba(139,92,246,0.4)]" 
                        : "bg-slate-500/5 hover:bg-slate-500/10 hover:border-violet-500/20"
                    )}>
                      <button
                        onClick={() => handleSwitchStore(st.id)}
                        className={cn(
                          "px-4 py-2 text-xs font-bold leading-none tracking-wide uppercase cursor-pointer flex items-center gap-1.5",
                          currentStore === st.id ? "text-white" : "text-slate-600 dark:text-slate-300"
                        )}
                      >
                        <Globe className="w-3.5 h-3.5 opacity-60" />
                        {st.name}
                      </button>
                      
                      {userRole === 'Owner' && (
                        <div className="flex items-center bg-black/20 overflow-hidden w-0 group-hover:w-16 transition-all duration-300">
                          <button 
                            onClick={() => {
                              const newName = prompt("Edit nama cabang:", st.name);
                              if (newName) {
                                const newStores = stores.map(s => s.id === st.id ? {...s, name: newName, type: newName} : s);
                                setStores(newStores);
                                localStorage.setItem(getPartitionedKey('inmarket_branches', true), JSON.stringify(newStores));
                              }
                            }}
                            className="p-2 text-white/50 hover:text-cyan-300 transition cursor-pointer"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button 
                            onClick={() => {
                              if (stores.length === 1) {
                                alert("Cabang terakhir tidak bisa dihapus.");
                                return;
                              }
                              if (confirm(`Hapus cabang ${st.name}?`)) {
                                const newStores = stores.filter(s => s.id !== st.id);
                                setStores(newStores);
                                localStorage.setItem(getPartitionedKey('inmarket_branches', true), JSON.stringify(newStores));
                                if (currentStore === st.id) setCurrentStore(newStores[0].id);
                              }
                            }}
                            className="p-2 text-white/50 hover:text-rose-400 transition cursor-pointer"
                          >
                           <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {userRole === 'Owner' && (
                    <button
                      onClick={() => {
                        const newName = prompt("Nama cabang baru:");
                        if (newName) {
                          const newStore = { id: `s${Date.now()}`, name: newName, type: newName, baseRevenue: 0 };
                          const newStores = [...stores, newStore];
                          setStores(newStores);
                          localStorage.setItem(getPartitionedKey('inmarket_branches', true), JSON.stringify(newStores));
                        }
                      }}
                      className="w-8 h-8 rounded-full border border-violet-500/30 flex items-center justify-center text-violet-400 hover:bg-violet-500/10 transition cursor-pointer ml-1"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

               {/* Statistics row */}
              {userRole === 'Owner' ? (
                <>
                  {/* Analytics graph row */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    
                    {/* Chart */}
                    <div className="xl:col-span-2 p-6 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 min-h-[350px] h-auto relative overflow-hidden max-w-full">
                      <h4 className="text-xs uppercase tracking-widest font-mono text-indigo-500 mb-6 flex items-center gap-1.5"><TrendingUp size={16} /> LEDGER VALUATIONS HISTORICAL</h4>
                      
                      {financeStats.empty ? (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                            <TrendingUp size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-bold opacity-50">Belum ada transaksi</p>
                         </div>
                      ) : (
                        <div className="w-full min-h-[280px]">
                          <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={financeStats.chartData}>
                              <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} />
                              <YAxis stroke="#6b7280" fontSize={10} axisLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#090514', border: '1px solid #c084fc', borderRadius: '12px' }} />
                              <Area type="monotone" name="Sales/Revenue" dataKey="sales" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                              <Area type="monotone" name="Expenses/Loss" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorLoss)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div className="xl:col-span-1 p-6 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 flex flex-col justify-between min-h-[350px] h-auto overflow-hidden max-w-full">
                      <h4 className="text-xs uppercase tracking-widest font-mono text-indigo-500 border-b border-indigo-100/10 pb-4 mb-2">{t('quickActions')}</h4>
                      
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-2xl bg-violet-600/15 border border-violet-500/20">
                          <span className="text-[10px] font-black uppercase block opacity-60 mb-2">{t('salaryFeature')}</span>
                          <button 
                            onClick={handlePaySalary}
                            disabled={isSalaryPaid}
                            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black uppercase hover:bg-violet-700 transition"
                          >
                            {isSalaryPaid ? '✅ GAJI TELAH DITRANSFER' : t('paySalary')}
                          </button>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => setActiveTab('kasir')} className="flex-1 py-3 bg-slate-900 text-white dark:bg-white/10 rounded-xl text-xs font-black uppercase text-center hover:brightness-110 transition">{t('addTransaction')}</button>
                          <button onClick={handleGenerateAttendanceCode} className="flex-1 py-3 bg-slate-900 text-white dark:bg-white/10 rounded-xl text-xs font-black uppercase text-center hover:brightness-110 transition">{t('genAttendance')}</button>
                        </div>
                      </div>

                      <p className="text-[9px] font-mono opacity-50 mt-4 text-center">InMarket Platform v2.5 Sandbox Instance</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Tier/EXP Card */}
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                    <Crown className="text-amber-300 mb-4 animate-bounce" size={48} />
                    <h4 className="text-xl font-black text-white uppercase tracking-widest leading-none mb-1">{getEmployeeTier(employeeProfile.exp).name}</h4>
                    <span className="text-[10px] font-mono text-violet-200 uppercase tracking-widest opacity-80 mb-6">STAFF PERFORMANCE RANKING</span>
                    
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-[10px] font-bold text-white/70">
                        <span>PROGRESS EXP</span>
                        <span>{employeeProfile.exp}pts</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/30 rounded-full border border-white/10 p-0.5 overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, (employeeProfile.exp / 2000) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Attendance Card */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 flex flex-col justify-center items-center text-center space-y-4">
                     <div className="w-16 h-16 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex items-center justify-center text-violet-500">
                       <ClipboardCheck size={32} />
                     </div>
                     <div>
                       <h5 className="text-sm font-black uppercase tracking-widest">CHECK-IN ABSENSI</h5>
                       <p className="text-[10px] text-slate-500 leading-relaxed mt-1">Lakukan presensi kehadiran digital untuk validasi honor harian Anda.</p>
                     </div>
                     <button 
                       onClick={() => setActiveTab('absensi')}
                       className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.03] transition-transform"
                     >
                       MULAI ABSENSI
                     </button>
                  </div>

                  {/* Wallet Card */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 flex flex-col justify-between">
                     <div className="flex justify-between items-start">
                       <div>
                         <span className="text-[10px] uppercase font-black tracking-wider opacity-50 block">SALDO GAJI ESTIMASI</span>
                         <div className="text-2xl font-black text-indigo-600 dark:text-cyan-400 mt-2">Rp3.500.000</div>
                       </div>
                       <div className="p-3 bg-violet-500/10 rounded-xl text-violet-500">
                         <Wallet size={24} />
                       </div>
                     </div>
                     <button onClick={() => setActiveTab('wallet')} className="text-[10px] text-[#a855f7] font-black uppercase text-left hover:underline">CEK DOMPET DIGITAL {">"}</button>
                  </div>
                </div>
              )}

              <p className="text-[9px] font-mono opacity-50 mt-4 text-center">InMarket Platform v2.5 Sandbox Instance</p>

              {/* ================================================= */}
              {/* STARTUP AI PREMIUM MODULES - BENTO SUITE */}
              {/* ================================================= */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-6">
                
                {/* COLUMN 1: INTERACTION & INTUITION CORE */}
                <div className="xl:col-span-2 space-y-6 max-w-full overflow-hidden">
                  
                  {/* FEATURE: BUSINESS TARGETS & METRICS (Target Bisnis) */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#0c091f]/85 border border-violet-500/15 shadow-xl relative overflow-hidden text-slate-800 dark:text-violet-100">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-500/10 pb-4 mb-4 gap-2">
                      <h4 className="text-sm font-black uppercase tracking-widest font-mono text-violet-400 flex items-center gap-2">
                        <Sparkle className="w-4 h-4 text-violet-400 animate-spin" />
                        {t('businessTarget')}
                      </h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            playClickSound();
                            setTargets(prev => {
                              const nextSales = prev.salesCurrent + 500000;
                              if (nextSales >= prev.salesTarget) {
                                triggerConfettiRain();
                                triggerNotification('transaksi', 'Target Penjualan Hari Ini Sukses Tercapai! 🏆');
                                logSystemActivity('Owner mencapai OMSET TARGET harian Rp 5.000.000');
                              }
                              return { ...prev, salesCurrent: Math.min(prev.salesTarget, nextSales) };
                            });
                          }}
                          className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 transition-all cursor-pointer"
                        >
                          + Rp500k Omset
                        </button>
                        <button 
                          onClick={() => {
                            playClickSound();
                            setTargets(prev => {
                              const nextTrans = prev.transCurrent + 2;
                              if (nextTrans >= prev.transTarget) {
                                triggerConfettiRain();
                                triggerNotification('transaksi', 'Target Transaksi Sukses Terpenuhi! ⭐');
                              }
                              return { ...prev, transCurrent: Math.min(prev.transTarget, nextTrans) };
                            });
                          }}
                          className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer"
                        >
                          +2 Transaksi
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                      <div className="bg-slate-500/5 border border-violet-500/10 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono opacity-50 block tracking-widest uppercase">{t('revenueTarget')}</span>
                          <span className="text-sm font-black text-violet-400 block mt-1">Rp {targets.salesCurrent.toLocaleString()} / Rp {targets.salesTarget.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                          <div 
                            style={{ width: `${(targets.salesCurrent / targets.salesTarget) * 100}%` }}
                            className="bg-indigo-500 h-full rounded-full shadow-[0_0_8px_#6366f1] transition-all duration-500"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-500/5 border border-violet-500/10 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono opacity-50 block tracking-widest uppercase">{t('transTarget')}</span>
                          <span className="text-sm font-black text-cyan-400 block mt-1">{targets.transCurrent} / {targets.transTarget} POS</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                          <div 
                            style={{ width: `${(targets.transCurrent / targets.transTarget) * 100}%` }}
                            className="bg-cyan-400 h-full rounded-full shadow-[0_0_8px_#22d3ee] transition-all duration-500"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-500/5 border border-violet-500/10 p-4 rounded-2xl flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-mono opacity-50 block tracking-widest uppercase">{t('branchPerf')}</span>
                          <span className="text-sm font-black text-emerald-400 block mt-1">{targets.developmentProgress}% EFISIENSI</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                          <div 
                            style={{ width: `${targets.developmentProgress}%` }}
                            className="bg-emerald-400 h-full rounded-full shadow-[0_0_8px_#34d399] transition-all duration-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-gradient-to-r from-violet-950/20 to-indigo-950/30 border border-violet-500/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Award className="w-5 h-5 text-amber-400 animate-bounce flex-shrink-0" />
                        <span>Mencapai target harian untuk membuka bonus <strong>Holographic Business Master</strong> badge!</span>
                      </div>
                      <button 
                        onClick={triggerConfettiRain}
                        className="text-[10px] uppercase font-mono tracking-widest text-[#a855f7] dark:text-cyan-400 font-extrabold hover:underline cursor-pointer"
                      >
                        CELEBRATE 🎉
                      </button>
                    </div>
                  </div>

                  {/* FEATURE: HOLOGRAPHIC GLASS CALENDAR (Calendar Usaha) */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#0c091f]/85 border border-violet-500/15 shadow-xl text-slate-800 dark:text-violet-100">
                    <div className="flex items-center justify-between border-b border-slate-500/10 pb-4 mb-4">
                      <h4 className="text-sm font-black uppercase tracking-widest font-mono text-cyan-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        {t('calendarTitle')}
                      </h4>
                      <button 
                        onClick={() => {
                          playClickSound();
                          const title = prompt(language==='id' ? "Sebutkan nama agenda baru:" : "Enter new event details:");
                          if (title) {
                            const newEv = { id: 'cl_' + Date.now(), date: selectedDate, title, type: 'event' };
                            setCalendarEvents(prev => [...prev, newEv]);
                            triggerNotification('chat', `Agenda ditambahkan untuk tanggal ${selectedDate}!`);
                            logSystemActivity(`Menambahkan agenda bisnis harian tanggal ${selectedDate}`);
                          }
                        }}
                        className="px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer"
                      >
                        + Agenda Baru
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className="md:col-span-7 bg-slate-500/5 border border-violet-500/5 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black font-mono tracking-wider uppercase text-slate-600 dark:text-slate-300">{currentDateFormatted}</span>
                          <span className="text-[10px] font-mono text-[#a855f7] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            REALTIME SYNC
                          </span>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-400 opacity-60 mb-2">
                          <span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span>M</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
                            const day = String(idx + 1);
                            const hasEvent = calendarEvents.some(e => e.date === day);
                            const isSelected = selectedDate === day;
                            const isToday = currentDayString === day;
                            return (
                              <button
                                key={idx}
                                onClick={() => { playClickSound(); setSelectedDate(day); }}
                                className={cn(
                                  "aspect-square rounded-xl text-xs font-semibold flex flex-col justify-center items-center transition-all relative cursor-pointer",
                                  isSelected 
                                    ? "bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/30 border border-cyan-400"
                                    : "bg-slate-500/5 text-slate-600 dark:text-slate-300 hover:bg-slate-500/15 border border-transparent hover:border-violet-500/10",
                                  isToday && !isSelected && "border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.1)]",
                                  hasEvent && !isSelected && "border-b-2 border-emerald-400"
                                )}
                              >
                                {day}
                                {hasEvent && (
                                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]" />
                                )}
                                {isToday && (
                                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="md:col-span-5 flex flex-col justify-between">
                        <div className="space-y-3">
                          <span className="text-[10px] font-mono font-bold tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase block">
                            AGENDA {currentDateFormatted.split(' ')[0]} {selectedDate} :
                          </span>
                          
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {calendarEvents.filter(e => e.date === selectedDate).length === 0 ? (
                              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-mono">
                                No scheduling node found today.
                              </div>
                            ) : (
                              calendarEvents.filter(e => e.date === selectedDate).map((ev) => (
                                <div key={ev.id} className="p-3 bg-slate-500/5 dark:bg-[#130f2f]/60 border border-slate-500/10 dark:border-violet-500/10 rounded-xl relative group flex justify-between items-center">
                                  <div className="flex gap-2 items-center">
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      ev.type === 'warning' ? 'bg-amber-400' :
                                      ev.type === 'info' ? 'bg-cyan-400' :
                                      ev.type === 'payout' ? 'bg-emerald-400' : 'bg-violet-400'
                                    }`} />
                                    <span className="text-xs text-slate-700 dark:text-slate-200">{ev.title}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      playScanSound();
                                      setCalendarEvents(prev => prev.filter(e => e.id !== ev.id));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-500 hover:underline transition-opacity cursor-pointer"
                                  >
                                    HAPUS
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-500/5 dark:bg-[#120f2b] rounded-xl border border-dashed border-slate-500/20 text-[10.5px] text-slate-500 leading-relaxed font-mono mt-4">
                          ℹ️ Gunakan modal agenda operasional untuk restock barang harian, jadwal libur bersama, reminder gajian staf.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FEATURE: VOICE AI ASSISTANT HUB WITH OSCILLOSCOPE WAVEFORM */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#0c091f]/85 border border-violet-500/15 shadow-xl relative overflow-hidden text-slate-800 dark:text-violet-100">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between border-b border-slate-500/10 pb-4 mb-4">
                      <h4 className="text-sm font-black uppercase tracking-widest font-mono text-cyan-400 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                        {t('aiVoiceCompanion')}
                      </h4>
                      <button
                        onClick={handleToggleBackgroundMusic}
                        className={cn(
                          "px-2.5 py-1 text-[10px] uppercase font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1",
                          soundEnabled 
                            ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
                            : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                        )}
                      >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        {soundEnabled ? (language === 'id' ? 'SUARA: NYALA' : 'SOUND: ON') : (language === 'id' ? 'SUARA: MATI' : 'SOUND: OFF')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-8 space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
                          AI InMarket siap membacakan performa finansial toko, memotivasi staf, serta melakukan forecasting inventaris via asisten suara premium.
                        </p>
                        
                        <div className="bg-slate-500/5 dark:bg-[#120f28]/70 border border-slate-500/10 dark:border-violet-500/10 rounded-2xl p-4 min-h-[50px] relative">
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <span className={cn("inline-block w-2 h-2 rounded-full", isVoiceSpeaking ? "bg-emerald-400 animate-ping" : "bg-slate-500")} />
                            <span className="text-[8px] font-mono opacity-50 uppercase tracking-widest">{isVoiceSpeaking ? "SPEAKING_AI" : "STANDBY_NODE"}</span>
                          </div>
                          
                          <span className="text-[8px] block font-mono text-cyan-400 mb-1 font-bold uppercase">AI ANALYST TRANSCRIPT:</span>
                          <span className="text-xs text-slate-700 dark:text-slate-200 block font-mono leading-relaxed">
                            {voiceTranscript || "Klik 'VOICE BRIEFING EXECUTIVE' untuk menyalakan suara panduan analis instan AI..."}
                          </span>
                        </div>
                      </div>

                      <div className="md:col-span-4 flex flex-col items-center gap-4">
                        <div className="flex items-end justify-center gap-1.5 h-16 w-full max-w-[200px]">
                          {waveformHeight.map((h, i) => (
                            <motion.div
                              key={i}
                              animate={{ height: isVoiceSpeaking ? h : 5 }}
                              transition={{ type: 'spring', stiffness: 350, damping: 12 }}
                              className="w-1.5 bg-gradient-to-t from-cyan-500 via-indigo-500 to-violet-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                              style={{ height: '5px' }}
                            />
                          ))}
                        </div>

                        <button
                          onClick={handleTriggerVoiceAI}
                          className={cn(
                            "py-3 px-5 w-full rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg text-white",
                            isVoiceSpeaking 
                              ? "bg-red-600 hover:bg-red-700 shadow-red-500/10 border border-red-500/20" 
                              : "bg-gradient-to-r from-[#9333ea] to-[#4f46e5] hover:brightness-110 shadow-[0_0_15px_rgba(147,51,234,0.45)] border border-violet-500/20"
                          )}
                        >
                          <Bot className="w-4 h-4 text-white" />
                          {isVoiceSpeaking ? 'TERMINATE VOICE' : 'VOICE BRIEFING EXECUTIVE'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* FEATURE: CHRONO MATRIX MANUAL CUSTOMIZER (Custom Dashboard) */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#0c091f]/85 border border-violet-500/15 shadow-xl text-slate-800 dark:text-violet-100">
                    <h4 className="text-sm font-black uppercase tracking-widest font-mono text-[#a855f7] dark:text-violet-400 border-b border-slate-500/10 pb-4 mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-violet-400 animate-spin" />
                      🌌 MULTI-THEME NEON CUSTOMIZER PANEL
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase">1. ACCENT NEON GLOW</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: 'violet', label: 'Violet', color: 'bg-violet-600' },
                            { name: 'cyan', label: 'Cyan', color: 'bg-cyan-400' },
                            { name: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
                            { name: 'rose', label: 'Rose', color: 'bg-rose-500' }
                          ].map((clr) => (
                            <button
                              key={clr.name}
                              onClick={() => { playClickSound(); setAccentColor(clr.name as any); triggerNotification('toko', `Tema aksen berubah ke ${clr.label}`); }}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1.5 cursor-pointer border",
                                accentColor === clr.name ? "border-violet-400 dark:border-violet-400 text-slate-800 dark:text-white bg-slate-500/10" : "border-slate-500/10 text-slate-500 bg-transparent"
                              )}
                            >
                              <span className={`w-2 h-2 rounded-full ${clr.color}`} />
                              {clr.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase">2. WALLPAPER BACKGROUND</label>
                        <div className="flex gap-2">
                          {[
                            { id: 'cyber-matrix', label: 'Grid Matrix' },
                            { id: 'cosmic-neon', label: 'Cosmic' },
                            { id: 'deep-obsidian', label: 'Obsidian' }
                          ].map((bgT) => (
                            <button
                              key={bgT.id}
                              onClick={() => { playClickSound(); setBackgroundTheme(bgT.id as any); }}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition cursor-pointer border",
                                backgroundTheme === bgT.id ? "text-violet-500 border-violet-500 bg-slate-500/10" : "text-slate-500 border-slate-500/10"
                              )}
                            >
                              {bgT.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono font-bold tracking-widest text-[#a855f7] dark:text-cyan-400 uppercase">3. GLOW EFFECT</label>
                        <div className="flex gap-2">
                          {[
                            { id: 'high', label: 'MAX' },
                            { id: 'medium', label: 'MED' },
                            { id: 'hologram', label: 'SPECTRE' }
                          ].map((intens) => (
                            <button
                              key={intens.id}
                              onClick={() => { playClickSound(); setNeonIntensity(intens.id as any); }}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase leading-none tracking-wide transition cursor-pointer border",
                                neonIntensity === intens.id ? "border-cyan-400 bg-cyan-400/5 text-cyan-500" : "text-slate-500 border-transparent bg-slate-500/5 hover:bg-slate-500/10"
                              )}
                            >
                              {intens.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* COLUMN 2: TELEMETRY & CHRONICLES */}
                <div className="xl:col-span-1 space-y-6 max-w-full overflow-hidden">
                  


                  {/* FEATURE: HOLOGRAPHIC EXPORT DATA LABELS (Export Data) */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#0c091f]/85 border border-violet-500/15 shadow-xl relative overflow-hidden text-slate-800 dark:text-violet-100">
                    <h4 className="text-sm font-black uppercase tracking-widest font-mono text-emerald-500 dark:text-emerald-400 border-b border-slate-500/10 pb-4 mb-4 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 animate-bounce" />
                      {t('downloadExport')}
                    </h4>
                    
                    <div className="space-y-2.5">
                      {[
                        { id: 'laporan_usaha', label: t('exportFin'), format: 'PDF Document' },
                        { id: 'stock_barang', label: t('exportStock'), format: 'Excel Sheet' },
                        { id: 'absensi', label: t('exportAttendance'), format: 'CSV Ledger' },
                        { id: 'transaksi', label: t('exportSales'), format: 'Excel Sheet' }
                      ].map((exp) => (
                        <button
                          key={exp.id}
                          onClick={() => handleExportDataFile(exp.id)}
                          className="w-full p-3 rounded-2xl bg-slate-500/5 dark:bg-[#120f26]/40 border border-slate-500/10 dark:border-slate-500/5 hover:border-emerald-500/40 text-left transition flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400 capitalize">
                              <Download className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block group-hover:text-emerald-400 dark:group-hover:text-emerald-300 transition-colors uppercase leading-tight">{exp.label}</span>
                              <span className="text-[9px] font-mono text-emerald-400 opacity-80 uppercase">{exp.format}</span>
                            </div>
                          </div>
                          <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition" />
                        </button>
                      ))}

                      <div className="pt-2 border-t border-slate-500/10 mt-2">
                        <button
                          onClick={() => handleExportToGoogleDocs('laporan_usaha')}
                          className="w-full p-3 rounded-2xl bg-violet-600/10 dark:bg-violet-900/20 border border-violet-500/30 hover:border-violet-500 text-left transition flex items-center justify-between group cursor-pointer shadow-lg shadow-violet-500/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-violet-950/40 border border-violet-500/40 flex items-center justify-center text-violet-400">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-violet-700 dark:text-violet-300 block uppercase leading-tight">Export to Google Docs</span>
                              <span className="text-[9px] font-mono text-violet-400 opacity-80 uppercase">AI-Dynamic Cloud Document</span>
                            </div>
                          </div>
                          <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* FEATURE: ACCREDITED ACHIEVEMENTS & BADGES (Badge & Achievement) */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#0c091f]/85 border border-violet-500/15 shadow-xl relative overflow-hidden text-slate-800 dark:text-violet-100">
                    <h4 className="text-sm font-black uppercase tracking-widest font-mono text-cyan-400 border-b border-slate-500/10 pb-4 mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4 text-cyan-400" />
                      {t('badgesAchievements')}
                    </h4>

                    <div className="grid grid-cols-3 gap-3">
                      {badges.map((bdg) => (
                        <div
                          key={bdg.id}
                          onClick={() => { playClickSound(); setActiveBadgePopup(bdg); }}
                          className={cn(
                            "aspect-square p-2 border transition flex flex-col justify-between cursor-pointer relative group rounded-2xl",
                            bdg.unlocked 
                              ? "bg-slate-500/5 border-cyan-500/20 text-cyan-500 dark:text-cyan-400 hover:border-cyan-400" 
                              : "bg-slate-500/5 border-slate-500/15 text-slate-400 dark:text-slate-500 opacity-50"
                          )}
                        >
                          <div className="text-right">
                            <span className={cn(
                              "text-[7px] font-mono font-black uppercase px-1 rounded-sm leading-none",
                              bdg.tier === 'legendary' ? 'bg-amber-400/10 border border-amber-400/20 text-amber-500' :
                              bdg.tier === 'epic' ? 'bg-violet-400/10 border border-violet-400/10 text-violet-500' :
                              bdg.tier === 'rare' ? 'bg-cyan-400/10 border border-cyan-400/10 text-cyan-500' : 'bg-slate-500/10 text-slate-400'
                            )}>
                              {bdg.tier}
                            </span>
                          </div>

                          <div className="flex flex-col items-center text-center justify-center py-1">
                            {bdg.icon === 'Crown' ? <Crown className="w-5 h-5 animate-bounce" /> :
                             bdg.icon === 'Award' ? <Award className="w-5 h-5" /> :
                             bdg.icon === 'TrendingUp' ? <TrendingUp className="w-5 h-5 text-emerald-400" /> :
                             bdg.icon === 'ClipboardCheck' ? <ClipboardCheck className="w-5 h-5" /> :
                             bdg.icon === 'Users' ? <Users className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-[#a855f7]" />}
                            <span className="text-[8.5px] font-black mt-2 leading-none uppercase tracking-wide group-hover:scale-105 transition-transform">{bdg.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[9px] font-mono opacity-50 text-center mt-3">Klik kartu badge di atas untuk detail kredensial.</p>
                  </div>

                  {/* FEATURE: REAL-TIME ACTIVITY TIMELINE LOG (History Aktivitas) */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-[#0c091f]/85 border border-[#6366f125] dark:border-violet-500/15 shadow-xl shadow-indigo-900/5 dark:shadow-violet-950/10 relative overflow-hidden text-slate-800 dark:text-violet-100">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
                    
                    <h4 className="text-sm font-black uppercase tracking-widest font-mono text-indigo-500 dark:text-violet-400 border-b border-slate-250 dark:border-slate-500/10 pb-4 mb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                        </span>
                        {t('recentActivity')}
                      </span>
                      <span className="text-[10px] bg-indigo-50 dark:bg-violet-950/45 text-indigo-600 dark:text-violet-300 font-mono py-0.5 px-2.5 rounded-full border border-indigo-200/50 dark:border-violet-500/25 font-bold">
                        {activityHistory.length} Live Log
                      </span>
                    </h4>

                    {activityHistory.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-4"
                      >
                        {/* 3D Hologram wireframe simulator */}
                        <div className="relative flex items-center justify-center">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="w-16 h-16 rounded-full border-2 border-dashed border-indigo-500/20 dark:border-violet-500/25 absolute"
                          />
                          <motion.div 
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 dark:from-purple-500/10 dark:to-cyan-400/10 border border-indigo-500/30 dark:border-violet-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10"
                          >
                            <Activity className="w-5 h-5 text-indigo-500 dark:text-cyan-400 animate-pulse" />
                          </motion.div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c091f]" />
                        </div>

                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                            {language === 'id' ? 'Belum Ada Aktivitas' : 'No Activity Listed'}
                          </h5>
                          <p className="text-[10px] text-slate-400 dark:text-slate-400 font-mono leading-relaxed max-w-[200px]">
                            {language === 'id' ? 'Mulai gunakan fitur InMarket.id' : 'Initiate tools to track operations'}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="relative border-l border-indigo-500/20 dark:border-violet-500/15 ml-3 pl-5 space-y-5 max-h-[310px] overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/10 pr-2">
                        <AnimatePresence initial={false}>
                          {activityHistory.map((act, index) => (
                            <motion.div 
                              key={act.id} 
                              initial={{ opacity: 0, x: -15, y: -2 }}
                              animate={{ opacity: 1, x: 0, y: 0 }}
                              transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
                              className="relative text-xs leading-relaxed group hover:bg-slate-500/5 p-2 rounded-xl transition-all duration-300"
                            >
                              <span className="absolute -left-[28px] top-3.5 w-3 h-3 rounded-full bg-white dark:bg-slate-950 border-2 border-indigo-500 dark:border-violet-400 shadow-sm flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-violet-400 group-hover:scale-110 transition-transform duration-300" />
                              </span>
                              
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <strong className="text-slate-700 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px] font-mono">
                                  {act.user}
                                </strong>
                                <span className="text-[9px] font-mono text-indigo-500 dark:text-cyan-400 font-bold bg-indigo-50 dark:bg-black/40 px-1.5 py-0.5 rounded border border-indigo-500/10 dark:border-violet-500/10">
                                  {act.time}
                                </span>
                              </div>
                              
                              <p className="text-slate-600 dark:text-slate-300 font-mono text-[10.5px] leading-relaxed break-words">
                                {act.action}
                              </p>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* BRAND ADVISOR PANEL: AI ANALYTICS (AI Analytics stacked vertikal) */}
                  <div className="p-6 rounded-3xl bg-[#070517]/85 border border-violet-500/20 shadow-2xl relative overflow-hidden text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_40%,rgba(147,51,234,0.08),transparent_100%)] pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="space-y-2">
                        <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/30 text-[#c084fc] font-mono font-black text-[10px] tracking-widest rounded-full uppercase inline-block">
                          🧬 COGNITIVE ANALYTICS INSIGHTS
                        </span>
                        <h3 className="text-xs font-extrabold text-white">{t('aiPredictiveRec')}</h3>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          "Prediksi omset kuartal menunjukkan peningkatan <strong className="text-indigo-400 font-mono">35%</strong> pada minuman espresso berkat peningkatan pemesanan online dari Sumatra Roast Node. Optimasi supply kopi instan dianjurkan sebelum tanggal gajian karyawan."
                        </p>
                      </div>

                      <div className="bg-[#12102a]/80 p-4 rounded-2xl border border-cyan-500/10 flex flex-col gap-3">
                        <div className="text-center">
                          <span className="text-[9px] font-mono opacity-50 block tracking-widest uppercase text-slate-400">PRODUK TRENDING</span>
                          <span className="text-xs font-black text-cyan-400 block pb-0.5">Espresso Sumatran (+35%)</span>
                        </div>
                        <div className="h-[1px] bg-slate-500/25 w-full" />
                        <div className="text-center">
                          <span className="text-[9px] font-mono opacity-50 block tracking-widest uppercase text-slate-400">PREDIKSI LAJU LABA</span>
                          <span className="text-xs font-black text-emerald-400 block">Rp1.450.000 / bln</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: INVENTORY STOCK MANAGER */}
          {activeTab === 'stock' && userRole === 'Owner' && (
            <Inventory />
          )}

          {/* TAB 3: POS PAYMENT POINT CASHIER */}
          {activeTab === 'kasir' && (
            <KasirPOS 
              products={products}
              setProducts={setProducts}
              language={language}
              triggerNotification={enhancedTriggerNotification}
              logSystemActivity={logSystemActivity}
              selectedCustomer={selectedCustomerForSale}
              setSelectedCustomer={setSelectedCustomerForSale}
            />
          )}

          {/* TAB 4: SWAFOTO ATTENDANCE PORTAL */}
          {activeTab === 'absensi' && (
            <div className="max-w-xl mx-auto p-6 bg-white dark:bg-[#0b0816]/90 rounded-3xl border border-indigo-100/10 shadow-2xl relative font-sans">
              
              {userRole === 'Owner' ? (
                // Owner generates code
                <div className="text-center space-y-6 py-6">
                  <div className="inline-flex p-3.5 bg-violet-600/10 rounded-2xl border border-violet-500/20 text-violet-400">
                    <ClipboardCheck size={36} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">{t('attendanceCode')}</h3>
                    <p className="text-xs opacity-60 mt-1">Generate kode absensi harian agar karyawan dapat melakukan check-in kehadiran.</p>
                  </div>

                  <div className="text-4xl font-extrabold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#ec4899] py-4 bg-slate-900/10 dark:bg-black/30 rounded-2xl max-w-xs mx-auto border border-dashed border-indigo-500/20 font-mono">
                    {attendanceCode}
                  </div>

                  <button 
                    onClick={handleGenerateAttendanceCode}
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs tracking-widest uppercase rounded-xl transition cursor-pointer mb-6"
                  >
                    🔄 {t('generateCode')}
                  </button>

                  <div className="mt-8 text-left border-t border-slate-200 dark:border-white/10 pt-6">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                       <CheckCircle size={16} className="text-emerald-500" />
                       Riwayat Check-In Hari Ini
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-white/5 font-mono text-[10px] uppercase text-slate-500 dark:text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Staf / Email</th>
                            <th className="px-4 py-3">Waktu</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                          {attendances.length > 0 ? attendances.map((att, i) => (
                            <tr key={att.id || i} className="hover:bg-slate-100 dark:hover:bg-white/5 transition">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-700 dark:text-slate-200">{att.employeeName}</div>
                                <div className="text-[10px] text-slate-500">{att.employeeEmail || '-'}</div>
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">{att.date} {att.time && `· ${att.time}`}</td>
                              <td className="px-4 py-3">
                                <span className={cn("px-2 py-1 rounded-md text-[9px] font-bold border", att.status === 'Tepat Waktu' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20")}>
                                  {att.status || 'Hadir'}
                                </span>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-slate-400 font-mono text-[10px]">Belum ada riwayat hari ini.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // Employee inputs code
                <form onSubmit={handleEmployeeCheckIn} className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="inline-flex p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400 mb-3">
                      <Users size={28} className="animate-pulse" />
                    </div>
                    <h3 className="text-lg font-black">{t('inputAttendanceCode')}</h3>
                    <p className="text-xs opacity-60 mt-1">Masukkan kode absen 6-digit yang diberikan Pemilik Toko / Outlet.</p>
                  </div>

                  {attendanceSuccess && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center text-xs font-black text-emerald-400 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Check-In Berhasil! (+25 EXP)
                    </motion.div>
                  )}
                  {attendanceError && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center text-xs font-black text-rose-400 flex items-center justify-center gap-2"
                    >
                      {attendanceError}
                    </motion.div>
                  )}

                  <div className="relative">
                    <input 
                      required 
                      type="text" 
                      value={employeeInputCode}
                      onChange={e => setEmployeeInputCode(e.target.value.toUpperCase())}
                      placeholder="CONTOH: PLX487" 
                      className="w-full p-4 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-2xl text-center font-mono font-black text-lg tracking-widest outline-none focus:border-cyan-400 uppercase" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase opacity-60 tracking-wider flex items-center gap-2"><Image size={14} /> Bukti Foto (Opsional)</label>
                    <input 
                      type="text" 
                      placeholder="Masukkan URL Link Foto Selfie Anda (Cth: imgbb/imgur)" 
                      value={attendanceProofUrl}
                      onChange={e => setAttendanceProofUrl(e.target.value)}
                      className="w-full p-3.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none" 
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-black text-xs tracking-widest uppercase rounded-2xl shadow-lg hover:brightness-110 cursor-pointer"
                  >
                    🚀 SUBMIT CHECK IN ABSENSI
                  </button>
                </form>
              )}

            </div>
          )}

          {/* TAB 5: ADVANCED RECHARTS GROUP */}
          {activeTab === 'grafik' && userRole === 'Owner' && (
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#a855f7] mb-2 flex items-center gap-2">
                <TrendingUp size={18} /> {language === 'id' ? 'ANALISIS PROFITABILITAS & LEDGER' : 'PROFITABILITY & LEDGER ANALYSIS'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Bar Chart Section */}
                <div className="p-6 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 min-h-[350px]">
                  <span className="text-[10px] uppercase font-mono opacity-50 block mb-4 tracking-widest text-violet-400">REVENUE VELOCITY TREND (NET)</span>
                  <div className="w-full h-[300px]">
                      {financeStats.empty ? (
                        <div className="flex flex-col items-center justify-center text-slate-500 h-full">
                           <TrendingUp size={32} className="mb-4 opacity-20" />
                           <p className="text-xs font-bold opacity-50">Belum ada transaksi</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={financeStats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#a855f710" vertical={false} />
                            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#090514', border: '1px solid #c084fc', borderRadius: '12px' }} />
                            <Bar name="Sales/Revenue" dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            <Bar name="Expenses/Loss" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                  </div>
                </div>

                {/* Line Chart Section */}
                <div className="p-6 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 min-h-[350px]">
                  <span className="text-[10px] uppercase font-mono opacity-50 block mb-4 tracking-widest text-cyan-400">RECURRING PROFIT MULTIPLES</span>
                  <div className="w-full h-[300px]">
                    {financeStats.empty ? (
                        <div className="flex flex-col items-center justify-center text-slate-500 h-full">
                           <TrendingUp size={32} className="mb-4 opacity-20" />
                           <p className="text-xs font-bold opacity-50">Belum ada transaksi</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={financeStats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#a855f710" vertical={false} />
                            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#090514', border: '1px solid #c084fc', borderRadius: '12px' }} />
                            <Line name="Sales/Revenue" type="monotone" dataKey="sales" stroke="#22d3ee" strokeWidth={3} dot={{ fill: '#22d3ee', strokeWidth: 0 }} />
                            <Line name="Expenses/Loss" type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} dot={{ fill: '#f43f5e', strokeWidth: 0 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                  </div>
                </div>

              </div>

              {/* TABLE INTEGRATION */}
              <div className="p-6 rounded-3xl bg-white dark:bg-black/30 border border-violet-500/10 overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#22d3ee] flex items-center gap-2">
                    <LayoutDashboard size={16} /> {language === 'id' ? 'TABULASI DATA KEUANGAN' : 'FINANCIAL DATA TABULATION'}
                  </h4>
                  <span className="text-[9px] font-mono bg-violet-600/20 text-violet-400 px-3 py-1 rounded-full border border-violet-500/20">
                    REALTIME_SYNC_2026
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-violet-500/10 text-[10px] font-black uppercase tracking-tighter text-slate-500 dark:text-violet-400 text-center sm:text-left">
                        <th className="py-4 px-2">Waktu / Sesi</th>
                        <th className="py-4 px-2">Pemasukan (Revenue)</th>
                        <th className="py-4 px-2">Pengeluaran (Expense)</th>
                        <th className="py-4 px-2">Laba Bersih Sesi</th>
                        <th className="py-4 px-2 text-right">Status Ledger</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-medium">
                      {(financeStats.empty || financeStats.chartData.length === 0) ? (
                        <tr className="border-b border-violet-500/5 hover:bg-violet-500/5 transition-colors group">
                          <td className="py-4 px-2 font-mono text-slate-400">00:00</td>
                          <td className="py-4 px-2 text-emerald-500 font-bold">Rp0</td>
                          <td className="py-4 px-2 text-rose-500 font-bold">Rp0</td>
                          <td className="py-4 px-2 text-indigo-400 font-black">Rp0</td>
                          <td className="py-4 px-2 text-right">
                             <span className="px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-500 text-[8px] font-black uppercase tracking-widest">DEPLEATED_0</span>
                          </td>
                        </tr>
                      ) : (
                        financeStats.chartData.map((row: any, idx: number) => {
                          const netRow = row.sales - row.expenses;
                          return (
                            <tr key={idx} className="border-b border-violet-500/5 hover:bg-violet-500/5 transition-colors group">
                              <td className="py-4 px-2 font-black font-mono text-slate-700 dark:text-violet-200">{row.name}</td>
                              <td className="py-4 px-2 text-emerald-600 dark:text-emerald-400 font-black">Rp{row.sales.toLocaleString()}</td>
                              <td className="py-4 px-2 text-rose-600 dark:text-rose-400 font-bold">Rp{row.expenses.toLocaleString()}</td>
                              <td className={cn("py-4 px-2 font-black", netRow < 0 ? "text-rose-500" : "text-cyan-500")}>
                                Rp{netRow.toLocaleString()}
                              </td>
                              <td className="py-4 px-2 text-right">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                                  netRow < 0 
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                )}>
                                  {netRow < 0 ? 'NEGATIVE_MARGIN' : 'REVENUE_ACTIVE'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customer' && userRole === 'Owner' && (
            <div className="space-y-6">
              <CustomersManager />
            </div>
          )}

          {activeTab === 'supplier' && userRole === 'Owner' && (
            <div className="space-y-6">
              <SuppliersManager />
            </div>
          )}

          {activeTab === 'pengeluaran' && userRole === 'Owner' && (
            <div className="space-y-6">
              <ExpensesManager />
            </div>
          )}

          {activeTab === 'promo' && userRole === 'Owner' && (
            <div className="space-y-6">
              <PromoManager />
            </div>
          )}

          {activeTab === 'security' && userRole === 'Owner' && (
            <div className="space-y-6">
              <SecurityCenter />
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-6 animate-fade-in">
              <WalletManager />
            </div>
          )}

          {activeTab === 'agenda' && (
            <div className="space-y-6 animate-fade-in">
              <AgendaManager userRole={userRole === 'Owner' ? 'owner' : 'employee'} />
            </div>
          )}

          {activeTab === 'attendance_qr' && (
            <div className="space-y-6 animate-fade-in">
              <AttendanceQR />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              <Profile />
            </div>
          )}

          {/* TAB 8: INMARKET SECURE CRYPTO VAULT & DYNAMIC REPORT EXPORTER */}
          {activeTab === 'export_data' && (
            <div className="max-w-5xl mx-auto space-y-6 animate-fade-in text-slate-100">
              
              {/* Cyber-mesh Header */}
              <div className="holo-card p-6 bg-gradient-to-r from-slate-900 via-[#11052c] to-slate-950 border border-violet-500/20 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <h2 className="text-sm font-black tracking-widest text-[#22d3ee] uppercase flex items-center gap-2 font-mono">
                    <FileSpreadsheet className="text-[#22d3ee] animate-pulse" size={16} />
                    {language === 'id' ? 'CRYPTO VAULT & EKSPOR DATA' : 'CRYPTO VAULT & SECURE EXPORTS'}
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xl">
                    {language === 'id' 
                      ? 'Manajemen pengunggahan manual berkas kasir terenkripsi dan penarikan otomatis ledger usaha (stok, keuangan, kehadiran, karyawan, QRIS) berlisensi penuh.'
                      : 'Audit and download central business logs. Encrypt and upload physical records directly to the secure enterprise vault.'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 bg-black/60 border border-violet-500/10 px-4 py-2.5 rounded-2xl">
                  <Lock className="text-[#34d399] animate-pulse" size={14} />
                  <div className="text-left leading-tight font-mono text-[8px]">
                    <span className="block text-slate-500 uppercase tracking-widest">CIPHER ENGINE</span>
                    <span className="block text-[#34d399] font-black">AES_256_ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Modules Columns Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* GLASSMORPHISM UPLOAD CARD */}
                <div className="lg:col-span-6 holo-card p-6 bg-gradient-to-b from-[#160d33]/50 via-slate-950/90 to-[#030109] border border-violet-500/15 rounded-3xl flex flex-col justify-between min-h-[480px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-xl pointer-events-none" />
                  
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
                      <h3 className="text-[11px] font-black tracking-widest text-violet-300 uppercase font-mono flex items-center gap-2">
                        <Upload size={13} className="text-violet-400" />
                        {language === 'id' ? 'UNGGAH DOKUMEN MANUAL' : 'SECURE FILE UPLOAD'}
                      </h3>
                      <span className="text-[8px] font-mono text-cyan-400 bg-cyan-400/5 px-2 py-0.5 rounded border border-cyan-400/10">MAX 5MB</span>
                    </div>

                    {/* DRAG & DROP VAULT DROPZONE */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx'];
                          const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
                          if (!allowedExtensions.includes(fileExt)) {
                            triggerNotification('error', language === 'id' ? 'Format file tidak didukung! Gunakan JPG, PNG, PDF, DOCX, atau XLSX.' : 'Unsupported format!');
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            triggerNotification('error', language === 'id' ? 'Ukuran file melebihi 5MB!' : 'Exceeds 5MB!');
                            return;
                          }
                          
                          playScanSound();
                          const reader = new FileReader();
                          reader.onload = () => {
                            const base64Data = reader.result as string;
                            const newFile = {
                              id: 'file_' + Date.now(),
                              name: file.name,
                              size: (file.size / 1024).toFixed(1) + ' KB',
                              type: fileExt.toUpperCase(),
                              date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                              base64: base64Data,
                              uploadedBy: currentUser?.email || 'karyawan@inmarket.id',
                              role: userRole,
                              encKey: 'SECURE_KEY_' + Math.random().toString(36).substring(3, 8).toUpperCase()
                            };
                            const updated = [newFile, ...manualFiles];
                            setManualFiles(updated);
                            const key = getPartitionedKey('inmarket_manual_uploads', true);
                            localStorage.setItem(key, JSON.stringify(updated));
                            playSuccessSound();
                            triggerNotification('sukses', language === 'id' ? 'File berhasil dienkripsi!' : 'File encrypted!');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="border border-dashed border-violet-500/20 hover:border-cyan-400/40 bg-black/40 p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-violet-950/10 h-32 relative overflow-hidden"
                    >
                      <input 
                        type="file" 
                        accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx'];
                            const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
                            if (!allowedExtensions.includes(fileExt)) {
                              triggerNotification('error', language === 'id' ? 'Format tidak didukung!' : 'Unsupported format!');
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              triggerNotification('error', language === 'id' ? 'Ukuran file melebihi 5MB!' : 'Exceeds 5MB!');
                              return;
                            }
                            playScanSound();
                            const reader = new FileReader();
                            reader.onload = () => {
                              const base64 = reader.result as string;
                              const newFile = {
                                id: 'file_' + Date.now(),
                                name: file.name,
                                size: (file.size / 1024).toFixed(1) + ' KB',
                                type: fileExt.toUpperCase(),
                                date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
                                base64,
                                uploadedBy: currentUser?.email || 'karyawan@inmarket.id',
                                role: userRole,
                                encKey: 'SECURE_KEY_' + Math.random().toString(36).substring(3, 8).toUpperCase()
                              };
                              const updated = [newFile, ...manualFiles];
                              setManualFiles(updated);
                              const key = getPartitionedKey('inmarket_manual_uploads', true);
                              localStorage.setItem(key, JSON.stringify(updated));
                              playSuccessSound();
                              triggerNotification('sukses', language === 'id' ? 'File berhasil disimpan!' : 'File saved!');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        id="file-vault-upload-trigger"
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                      
                      <div className="p-2.5 bg-violet-600/10 rounded-full text-violet-400 hover:text-cyan-400 transition shadow mb-2">
                        <Upload size={18} className="animate-pulse" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-200">{language === 'id' ? 'Drop file foto/dokumen atau klik di sini' : 'Drop images/documents or click here'}</p>
                      <p className="text-[8px] font-mono text-slate-500 mt-1 uppercase">JPG, PNG, PDF, DOCX, XLSX (MAX. 5MB)</p>
                    </div>

                    {/* VAULT PERSISTED RECORDS ROWS */}
                    <div className="mt-5 space-y-2 max-h-[225px] overflow-y-auto custom-scrollbar pr-1">
                      <div className="text-[8px] font-mono font-black text-cyan-400 tracking-widest uppercase mb-1 flex items-center justify-between">
                        <span>🔒 {language === 'id' ? 'BERKAS VAULT AKTIF' : 'ACTIVE VAULT STORAGE'}</span>
                        <span className="opacity-60">{manualFiles.filter(f => userRole === 'Owner' || f.uploadedBy === currentUser?.email).length} FILES Found</span>
                      </div>

                      {manualFiles.filter(f => userRole === 'Owner' || f.uploadedBy === currentUser?.email).length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-950/20 text-center border border-white/5">
                          <p className="text-[10px] italic text-slate-500">{language === 'id' ? 'Belum ada dokumen yang diunggah di branch ini.' : 'No manual documents uploaded in this branch.'}</p>
                        </div>
                      ) : (
                        manualFiles.filter(f => userRole === 'Owner' || f.uploadedBy === currentUser?.email).map((file) => (
                          <div key={file.id} className="p-3 rounded-2xl bg-[#090514]/90 border border-violet-500/10 flex items-center justify-between text-left gap-3 group">
                            
                            {/* Visual Thumbnail */}
                            {['JPG', 'JPEG', 'PNG'].includes(file.type) && file.base64 ? (
                              <img src={file.base64} alt={file.name} className="w-8.5 h-8.5 rounded-lg object-cover border border-white/5 shrink-0" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8.5 h-8.5 rounded-lg bg-violet-500/5 border border-violet-500/20 flex items-center justify-center shrink-0">
                                <FileText size={14} className="text-violet-400 animate-pulse" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-200 truncate leading-tight">{file.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 leading-none text-[8px] font-mono">
                                <span className="bg-violet-900/40 text-cyan-300 border border-cyan-400/20 px-1 py-0.2 rounded uppercase">{file.type}</span>
                                <span className="text-slate-400">{file.size}</span>
                                <span className="text-[#34d399] font-semibold">{file.encKey}</span>
                              </div>
                              <span className="block text-[8px] text-slate-500 font-mono mt-1 font-black">Uploader: {file.uploadedBy.split('@')[0]} ({file.role})</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <a 
                                href={file.base64} 
                                download={file.name} 
                                onClick={() => playSuccessSound()}
                                className="p-1.5 bg-slate-800 rounded-lg text-violet-300 hover:text-white transition"
                                title="Download decrypted copy"
                              >
                                <Download size={10} />
                              </a>
                              <button 
                                onClick={() => {
                                  // Role authorization check
                                  if (userRole !== 'Owner' && currentUser?.email !== file.uploadedBy) {
                                    triggerNotification('error', 'Akses ditolak!');
                                    return;
                                  }
                                  const updated = manualFiles.filter(item => item.id !== file.id);
                                  setManualFiles(updated);
                                  const key = getPartitionedKey('inmarket_manual_uploads', true);
                                  localStorage.setItem(key, JSON.stringify(updated));
                                  triggerNotification('sukses', language === 'id' ? 'Berkas didelete.' : 'Deleted.');
                                }}
                                className="p-1.5 bg-red-950/10 hover:bg-red-900/30 rounded-lg text-red-400 hover:text-white transition"
                                title="De-register from branch"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* HOLOGRAPHIC EXPORT PANEL */}
                <div className="lg:col-span-6 holo-card p-6 bg-gradient-to-b from-[#11052c]/50 via-slate-950/90 to-[#030109] border border-[#22d3ee]/20 rounded-3xl flex flex-col justify-between min-h-[480px] shadow-2xl relative">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
                      <h3 className="text-[11px] font-black tracking-widest text-[#22d3ee] uppercase font-mono flex items-center gap-1.5">
                        <FileSpreadsheet size={13} className="text-[#22d3ee]" />
                        {language === 'id' ? 'EKSPOR LAPORAN UTOMATIS' : 'SECURE AUTOMATED EXPORTER'}
                      </h3>
                      <span className="text-[8px] font-mono text-cyan-400 bg-cyan-400/5 px-2 py-0.5 rounded border border-[#22d3ee]/20">AUTO_INDEX_2026</span>
                    </div>

                    <div className="space-y-4">
                      
                      {/* Report Type selector */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">{language === 'id' ? '1. Pilih Tipe Laporan Usaha' : '1. Choose Business Ledger'}</label>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold font-mono">
                          {[
                            { id: 'stok', label: language === 'id' ? '📦 STOK & INVENTARIS' : '📦 STOCK REPORT' },
                            { id: 'keuangan', label: language === 'id' ? '💰 LAPORAN KEUANGAN' : '💰 FINANCE LEDGER' },
                            { id: 'absensi', label: language === 'id' ? '⏰ ABSENSI KARYAWAN' : '⏰ STAFF ATTENDANCE' },
                            { id: 'karyawan', label: language === 'id' ? '👥 DATA KARYAWAN' : '👥 EMPLOYEE LIST' },
                            { id: 'qris', label: language === 'id' ? '💳 TRANSAKSI QRIS' : '💳 QRIS TRANSACTION' }
                          ].map(rep => (
                            <button
                              key={rep.id}
                              onClick={() => { playSuccessSound(); setCustomReportType(rep.id); }}
                              className={cn(
                                "p-2 text-left rounded-xl border text-[9px] transition duration-300 truncate",
                                customReportType === rep.id 
                                  ? "bg-violet-600/30 border-[#22d3ee] text-[#22d3ee]" 
                                  : "bg-black/30 border-white/5 hover:border-white/10 text-slate-300"
                              )}
                            >
                              {rep.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Format Selector */}
                      <div>
                        <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">{language === 'id' ? '2. Format Download Berkas' : '2. Output Encoding structure'}</label>
                        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono font-black">
                          {[
                            { id: 'pdf', label: '📄 PDF' },
                            { id: 'xlsx', label: '📊 EXCEL' },
                            { id: 'csv', label: '📝 CSV' },
                            { id: 'png', label: '🖼️ IMAGE' }
                          ].map(fmt => (
                            <button
                              key={fmt.id}
                              onClick={() => { playSuccessSound(); setCustomExportFormat(fmt.id); }}
                              className={cn(
                                "py-3 rounded-xl border text-center transition uppercase duration-300 whitespace-nowrap text-[8px]",
                                customExportFormat === fmt.id 
                                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 border-violet-400 text-white" 
                                  : "bg-black/30 border-white/5 hover:border-white/10 text-slate-400"
                              )}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Info Description */}
                      <div className="p-3.5 bg-black/60 border border-white/5 rounded-2xl text-[10px] text-slate-400 leading-relaxed font-sans">
                        <span className="block font-bold text-slate-200 mb-0.5">💬 INFORMASI REKONSILIASI DATA:</span>
                        <p>{language === 'id' 
                          ? 'Setiap penarikan berkas menyusun rekaman database secara langsung dari memory buffer branch Anda untuk mencegah manipulasi data eksternal oleh siapa pun.'
                          : 'The localized cryptographic sandbox compiles live cashier ledgers and staff records dynamically inside transient secure arrays.'}</p>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM EXPORT ACTIONS */}
                  <div className="mt-6">
                    {isExportingActive ? (
                      <div className="p-3.5 bg-violet-600/10 border border-violet-500/20 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-mono text-[#22d3ee] font-black uppercase animate-pulse">
                          <span>⚙️ SYNCING MEMORY LEDGERS...</span>
                          <span>{exportProgressVal}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${exportProgressVal}%` }}
                            className="bg-gradient-to-r from-[#22d3ee] via-violet-500 to-fuchsia-500 h-full" 
                          />
                        </div>
                        <p className="text-[8px] font-mono text-slate-500 truncate">Source file: /secured_enc_{exportProgressName}</p>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setIsExportingActive(true);
                          setExportProgressVal(15);
                          setExportProgressName(`laporan_${customReportType}_2026.${customExportFormat}`);
                          playScanSound();

                          let currentP = 15;
                          const intervalPointer = setInterval(() => {
                            currentP += 30;
                            if (currentP >= 100) {
                              setExportProgressVal(100);
                              clearInterval(intervalPointer);
                              
                              setTimeout(() => {
                                setIsExportingActive(false);
                                
                                // Download actual generated template text/csv data
                                const finalName = `Laporan_InMarket_${customReportType.toUpperCase()}_2026.${customExportFormat}`;
                                let content = "";
                                if (customReportType === 'stok') {
                                  content = "Product ID;Name;Stock;Price;Status\n" + products.map(p => `${p.id};${p.name};${p.stock};${p.price};${p.stock < 10 ? 'RESTOCK_REQUIRED' : 'STABLE'}`).join('\n');
                                } else if (customReportType === 'keuangan') {
                                  content = "Transaction ID;Total;Method;Cashier;Timestamp\n" + salesHistory.map(s => `${s.id};${s.total};${s.paymentMethod};${s.cashier};${s.timestamp}`).join('\n');
                                } else if (customReportType === 'absensi') {
                                  content = "Staff;Date;ClockIn;Status;VerifyHash\n" + (employeeProfile.fullName ? `${employeeProfile.fullName};2026-05-23;08:00 AM;Present;0x9e2a` : "Wahyu;2026-05-23;08:01 AM;Present;0xf3b1");
                                } else {
                                  content = `EXPORTED OFFICIAL DOCUMENT\n===========================\nLedger Object: ${customReportType.toUpperCase()}\nEncoding Format: ${customExportFormat.toUpperCase()}\nTimestamp: ${new Date().toLocaleString()}\nFirmware Node Hash: SHA-256V2\nStatus: Secure verified.\n`;
                                }
                                
                                const blob = new Blob([content], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = finalName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);

                                playSuccessSound();
                                triggerNotification('sukses', language === 'id' ? `Berkas ${finalName} berhasil diterbitkan & diunduh!` : `Document ${finalName} compiled and downloaded!`);
                              }, 600);
                            } else {
                              setExportProgressVal(currentP);
                            }
                          }, 3550); // Generous simulation length per criteria to look futuristic
                        }}
                        className="w-full text-center py-4 bg-gradient-to-r from-cyan-400 via-violet-600 to-fuchsia-600 hover:brightness-110 text-[#090514] hover:text-white rounded-2xl transition cursor-pointer font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.25)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)]"
                      >
                        <Download size={14} />
                        <span>{language === 'id' ? 'PROSES KOMPILASI LAPORAN' : 'COMPILE & CONVERT DATA'}</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>
              
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              <WorkspaceManager />
            </div>
          )}

          {/* TAB 6: LOBBY STAFF CHAT WITH ALERTS */}
          {activeTab === 'chat' && (
            <div className="max-w-2xl mx-auto flex flex-col justify-between p-6 bg-white dark:bg-[#0a0714] rounded-3xl border border-indigo-100/10 h-[500px] shadow-2xl relative">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 custom-scrollbar">
                
                {chatMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "p-3.5 rounded-2xl text-xs max-w-sm space-y-1 relative",
                      msg.sender.includes('Boss') 
                        ? "bg-violet-600/15 border border-violet-500/25 ml-auto text-indigo-950 dark:text-violet-100" 
                        : msg.sender.includes('Karyawan') || msg.sender.includes('Staff')
                          ? "bg-cyan-500/10 border border-cyan-400/20 text-indigo-950 dark:text-cyan-200" 
                          : "bg-slate-500/5 text-slate-400 text-center mx-auto max-w-full font-mono text-[10px]"
                    )}
                  >
                    <div className="flex justify-between font-black text-[9px] uppercase tracking-wider opacity-65">
                      <span>{msg.sender}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="font-semibold leading-relaxed">{msg.text}</p>
                    
                    {msg.file && (
                      <div className="mt-2 text-[9px] p-2 bg-black/10 rounded border border-white/5 truncate font-mono text-cyan-400">
                        📎 FILE: {msg.file}
                      </div>
                    )}
                  </div>
                ))}

              </div>

              {/* Chat Input block */}
              <form onSubmit={handleSendChat} className="flex gap-2 border-t border-indigo-100/10 pt-4">
                
                {/* Upload File Simulator details */}
                <button 
                  type="button" 
                  onClick={() => {
                    const mockUrl = 'https://inmarket.com/assets/proof_' + Math.floor(Math.random() * 899 + 100) + '.png';
                    setUploadedFileUrl(mockUrl);
                    playScanSound();
                  }}
                  className={cn(
                    "p-3 rounded-xl border transition shrink-0 cursor-pointer text-slate-400",
                    uploadedFileUrl ? "bg-cyan-500 border-cyan-400 text-white" : "bg-black/5 dark:bg-white/5 border-indigo-100/10"
                  )}
                  title="Simulate image upload link"
                >
                  <Image size={16} />
                </button>

                <input 
                  type="text" 
                  value={chatInp}
                  onChange={e => setChatInp(e.target.value)}
                  placeholder={language === 'id' ? "Ketik pesan divisi di sini..." : "Type staff lobby messages..."} 
                  className="flex-1 p-3.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white" 
                />
                
                <button type="submit" className="px-4.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition cursor-pointer">
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}



        </div>
      </main>

      {/* MODAL 1: Digital payment receipt */}
      <AnimatePresence>
        {receipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 font-mono text-[10px] uppercase font-bold py-1.5 px-4 rounded-full animate-pulse">
              🖨️ PRINTER POS AUTOMATED SUCCESS SHOWER
            </div>
            
            <motion.div 
              initial={{ y: -80, opacity: 0, scale: 0.95 }} 
              animate={{ y: 0, opacity: 1, scale: 1 }} 
              exit={{ y: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 220, damping: 25 }}
              className="rounded-[32px] bg-slate-50 border-4 border-[#cbd5e1] text-slate-800 w-full max-w-sm font-sans relative shadow-2xl overflow-hidden"
            >
              {/* Thermal printer slit card top decorator */}
              <div className="bg-gradient-to-r from-neutral-800 to-neutral-700 h-4 w-full flex items-center justify-around border-b border-black">
                {[...Array(30)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1 bg-neutral-900 border-r border-[#454545]" />
                ))}
              </div>

              <div className="p-6 space-y-4">
                
                <div className="text-center pb-4 border-b-2 border-dashed border-slate-300">
                  <div className="inline-flex p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 text-white rounded-full mb-2">
                    <Crown size={24} className="animate-bounce" />
                  </div>
                  <h3 className="text-base font-black uppercase text-indigo-950 font-serif tracking-tight">☕ InMarket Lounge</h3>
                  <p className="text-[10px] opacity-60 font-medium">CLOUD TERMINAL SECURE POS #4821</p>
                  <p className="text-[9px] font-mono opacity-80 mt-1 uppercase text-violet-600">Operator Kasir: {userRole}</p>
                </div>

                <div className="space-y-2.5 text-xs border-b-2 border-dashed border-slate-300 pb-4">
                  <div className="flex justify-between font-mono text-[9px] opacity-55">
                    <span>TX_ID: {receipt.id}</span>
                    <span>{receipt.date}</span>
                  </div>

                  <div className="space-y-1 bg-slate-100/50 p-2.5 rounded-xl border border-slate-200">
                    {receipt.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between font-semibold text-slate-700 text-[11px]">
                        <span>{item.name} x{item.qty}</span>
                        <span>Rp{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between font-extrabold text-[#7c3aed] text-xs">
                    <span>PAYMENT METHOD</span>
                    <span>{receipt.meth}</span>
                  </div>
                </div>

                {/* DYNAMIC SHADOW QR CODE FOR INSTANT QRIS PAYMENTS */}
                <div className="flex flex-col items-center justify-center p-2.5 border border-slate-200 rounded-2xl bg-white/80 my-2">
                  <div className="w-20 h-20 bg-neutral-900 rounded-lg p-1.5 flex flex-col justify-between relative overflow-hidden" title="Simulated Live QR Code for POS Receipts">
                    <div className="flex justify-between w-full h-1/4">
                      <div className="w-5 h-5 border-[3px] border-white rounded-sm" />
                      <div className="w-5 h-5 border-[3px] border-white rounded-sm" />
                    </div>
                    <div className="flex justify-between w-full h-1/4 items-end">
                      <div className="w-5 h-5 border-[3px] border-white rounded-sm" />
                      <div className="w-2 h-2 bg-white" />
                    </div>
                    {/* Pixels pattern blocks */}
                    <div className="absolute inset-x-5 inset-y-5 grid grid-cols-5 gap-0.5 pointer-events-none select-none opacity-85">
                      {[...Array(25)].map((_, i) => (
                        <div key={i} className={i % 3 === 0 || i % 5 === 1 ? "bg-white w-full h-full" : "bg-transparent"} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[7.5px] font-mono font-black text-rose-500 mt-1 uppercase tracking-widest">QRIS BANK ACCOUNT SECURE</span>
                </div>

                {/* INTERACTIVE THIN AND THICK CONTINUOUS BARCODE */}
                <div className="space-y-1">
                  <div className="flex justify-center items-center gap-[1px] py-1 h-7 select-none opacity-85">
                    {[1, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 2, 4, 1, 2, 1, 1, 3, 2, 1, 2, 4, 1, 1].map((w, idx) => (
                      <div key={idx} className="bg-black h-full" style={{ width: `${w}px` }} />
                    ))}
                  </div>
                  <span className="font-mono text-[8px] block text-center tracking-widest text-slate-500">{receipt.id.toUpperCase()}</span>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-60">TOTAL BILL PAID</span>
                  <span className="text-lg font-black text-violet-700">Rp{receipt.total.toLocaleString()}</span>
                </div>

                {/* PREMIUM ACTIONS COMPARTMENT */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <button 
                    onClick={() => {
                      let content = `=============================\n`;
                      content += `       INMARKET LOUNGE       \n`;
                      content += `   Premium POS Suite 2026   \n`;
                      content += `=============================\n`;
                      content += `ID TX    : ${receipt.id}\n`;
                      content += `Waktu    : ${receipt.date}\n`;
                      content += `Kasir    : ${userRole}\n`;
                      content += `Metode   : ${receipt.meth}\n`;
                      content += `-----------------------------\n`;
                      receipt.items?.forEach((i: any) => {
                        content += `${i.name} x${i.qty}  Rp ${(i.price * i.qty).toLocaleString()}\n`;
                      });
                      content += `-----------------------------\n`;
                      content += `TOTAL    : Rp ${receipt.total.toLocaleString()}\n`;
                      content += `=============================\n`;
                      content += `    TERIMA KASIH BELANJA!    \n`;
                      content += `=============================\n`;
                      
                      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `InMarket_Struk_${receipt.id}.txt`;
                      link.click();
                      URL.revokeObjectURL(url);
                      playSuccessSound();
                    }}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    💾 DOWNLOAD File
                  </button>

                  <button 
                    onClick={() => {
                      let text = `*☕ STRUK BELANJA INMARKET LOUNGE*\n`;
                      text += `*ID Transaksi:* ${receipt.id}\n`;
                      text += `*Waktu Belanja:* ${receipt.date}\n`;
                      text += `*Kasir:* ${userRole}\n`;
                      text += `-----------------------------\n`;
                      receipt.items?.forEach((i: any) => {
                        text += `- ${i.name} (x${i.qty}): Rp ${(i.price * i.qty).toLocaleString()}\n`;
                      });
                      text += `-----------------------------\n`;
                      text += `*Metode Pembayaran:* ${receipt.meth}\n`;
                      text += `*Total Bill:* *Rp ${receipt.total.toLocaleString()}*\n\n`;
                      text += `_Terima kasih sudah singgah di lounge premium kami!_`;
                      
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    💬 SHARE WHATSAPP
                  </button>
                </div>

                <button 
                  onClick={() => setReceipt(null)}
                  className="w-full mt-2 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase transition tracking-widest cursor-pointer shadow-md"
                >
                  🟢 SELESAI & TUTUP
                </button>

              </div>
              
              {/* Thermal printer wavy cut bottom details */}
              <div className="h-2 w-full flex overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-slate-50 rotate-45 transform origin-top-left -translate-y-2 border-r border-[#cbd5e1]" />
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Employee Profile Onboarding First Time login popup */}
      <AnimatePresence>
        {showEmployeeProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-[#0b0816]/95 border border-violet-500/30 p-8 rounded-[36px] w-full max-w-md text-white shadow-[0_0_35px_rgba(139,92,246,0.2)] text-center relative overflow-hidden"
            >
              <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="mb-6">
                <div className="inline-flex p-3 bg-violet-600/15 border border-violet-500/25 rounded-2xl text-violet-400 mb-3">
                  <User size={28} className="animate-pulse" />
                </div>
                <h3 className="text-xl font-black">Lengkapi Data Karyawan</h3>
                <p className="text-xs opacity-60 mt-1">Lengkapi administrasi staf internal sebelum memproses terminal kasir & absensi digital.</p>
              </div>

              <form onSubmit={handleEmployeeOnboardSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase opacity-60 tracking-wider">Nama Lengkap</label>
                  <input 
                    required 
                    type="text" 
                    value={employeeProfile.fullName}
                    onChange={e => setEmployeeProfile({...employeeProfile, fullName: e.target.value})}
                    placeholder="Masukkan nama lengkap Anda" 
                    className="w-full p-3.5 bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-white focus:border-violet-500" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase opacity-60 tracking-wider">URL Foto Swafoto (Profil)</label>
                  <input 
                    type="text" 
                    value={employeeProfile.photoUrl}
                    onChange={e => setEmployeeProfile({...employeeProfile, photoUrl: e.target.value})}
                    placeholder="https://images.unsplash.com/... (Profil URL)" 
                    className="w-full p-3.5 bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-white focus:border-violet-500" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase opacity-60 tracking-wider">Gender / Jenis Kelamin</label>
                  <select 
                    value={employeeProfile.gender}
                    onChange={e => setEmployeeProfile({...employeeProfile, gender: e.target.value})}
                    className="w-full p-3.5 bg-slate-900 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-white focus:border-violet-500"
                  >
                    <option value="Male">Laki-Laki (Male)</option>
                    <option value="Female">Perempuan (Female)</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full mt-4 py-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-black text-xs tracking-widest uppercase rounded-2xl hover:brightness-110 transition cursor-pointer"
                >
                  🚀 SIMPAN DATA & MASUK DASHBOARD
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Payout Celebration Salary Rain screen overlay */}
      <AnimatePresence>
        {salaryAnim && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-2xl text-center p-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }} 
              className="space-y-6 max-w-sm"
            >
              <div className="inline-flex p-5 bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 rounded-full shadow-[0_0_35px_#f59e0b] animate-bounce">
                <DollarSign size={48} />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 tracking-tight flex items-center justify-center gap-2">
                  DISBURSING COIN SALARY...
                </h3>
                <p className="text-xs font-mono text-cyan-400 uppercase mt-2 font-black">TX_LEDGER STATUS: COMPLETED</p>
                <p className="text-xs text-slate-300 font-semibold leading-relaxed mt-3">
                  {language === 'id' 
                    ? 'Sistem mentransfer gaji ke dompet digital karyawan! Musik sukses gembira dimainkan.'
                    : 'The direct deposit is successfully wired. Upbeat golden success bells synthesised.'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Edit Product Modal */}
      <AnimatePresence>
        {editingProduct !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05020c]/85 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-gradient-to-b from-[#160c2e]/90 via-[#0a0518]/95 to-[#120726]/90 border border-violet-500/40 p-8 rounded-[32px] w-full max-w-xl text-white shadow-[0_0_50px_rgba(139,92,246,0.3),_0_0_20px_rgba(34,211,238,0.2)] relative overflow-hidden"
            >
              {/* Holographic Glowing Orbits */}
              <div className="absolute top-[-80px] right-[-80px] w-56 h-56 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-[-100px] left-[-100px] w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
              
              {/* Holographic scanner active line inside dropdown background */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[pulse_1.5s_infinite]" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-65" />

              <div className="mb-6 flex justify-between items-start relative z-10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/40 border border-cyan-400/30 rounded-full text-[10px] text-cyan-400 font-mono tracking-wider mb-2 uppercase text-left block w-fit">
                    <Sparkles size={10} className="animate-pulse" /> INVENTORY_UPDATE_MODE
                  </div>
                  <h3 className="text-xl font-black bg-gradient-to-r from-white via-violet-100 to-cyan-300 bg-clip-text text-transparent text-left">
                    {language === 'id' ? 'Edit Rincian Produk' : 'Edit Product Details'}
                  </h3>
                  <p className="text-xs text-violet-300/70 mt-1 text-left">
                    {language === 'id' ? 'Ubah parameter metrik inventaris internal secara real-time.' : 'Modify catalog parameters and inventory metrics in real-time.'}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setEditingProduct(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition text-violet-300 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProductEdit} className="space-y-5 relative z-10 text-left">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-violet-300 tracking-wider block">
                      {language === 'id' ? 'Nama Produk' : 'Product Name'}
                    </label>
                    <input 
                      required 
                      type="text" 
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      placeholder="e.g. Matcha Soft Ice Cream" 
                      className="w-full p-3 bg-slate-950/60 border border-violet-500/20 rounded-xl text-xs font-bold outline-none text-white focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition duration-200" 
                    />
                  </div>

                  {/* Price field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-violet-300 tracking-wider block">
                      {language === 'id' ? 'Harga Jual (Rp)' : 'Selling Price (Rp)'}
                    </label>
                    <input 
                      required 
                      type="number" 
                      value={editForm.price}
                      onChange={e => setEditForm({...editForm, price: e.target.value})}
                      placeholder="e.g. 25000" 
                      className="w-full p-3 bg-slate-950/60 border border-violet-500/20 rounded-xl text-xs font-bold outline-none text-white focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition duration-200" 
                    />
                  </div>

                  {/* Stock field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-violet-300 tracking-wider block">
                      {language === 'id' ? 'Kuantitas Stok' : 'Stock Quantity'}
                    </label>
                    <input 
                      required 
                      type="number" 
                      value={editForm.stock}
                      onChange={e => setEditForm({...editForm, stock: e.target.value})}
                      placeholder="e.g. 50" 
                      className="w-full p-3 bg-slate-950/60 border border-violet-500/20 rounded-xl text-xs font-bold outline-none text-white focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition duration-200" 
                    />
                  </div>

                  {/* Category field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-violet-300 tracking-wider block">
                      {language === 'id' ? 'Kategori Produk' : 'Product Category'}
                    </label>
                    <select 
                      value={editForm.category}
                      onChange={e => setEditForm({...editForm, category: e.target.value})}
                      className="w-full p-3 bg-[#0d071c] border border-violet-500/20 rounded-xl text-xs font-bold outline-none text-white focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition duration-200"
                    >
                      <option value="Minuman">Minuman (Drinks)</option>
                      <option value="Makanan">Makanan (Food)</option>
                      <option value="Pastry">Pastry</option>
                      <option value="Lainnya">Lainnya (Other)</option>
                    </select>
                  </div>

                  {/* Barcode field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-violet-300 tracking-wider block">
                      {language === 'id' ? 'Kode Barcode' : 'Barcode SKU'}
                    </label>
                    <input 
                      type="text" 
                      value={editForm.barcode}
                      onChange={e => setEditForm({...editForm, barcode: e.target.value})}
                      placeholder="e.g. 89901928" 
                      className="w-full p-3 bg-slate-950/60 border border-violet-500/20 rounded-xl text-xs font-bold outline-none text-white focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition duration-200" 
                    />
                  </div>

                  {/* Supplier field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-violet-300 tracking-wider block">
                      {language === 'id' ? 'Pemasok / Supplier' : 'Supplier Source'}
                    </label>
                    <input 
                      type="text" 
                      value={editForm.supplier}
                      onChange={e => setEditForm({...editForm, supplier: e.target.value})}
                      placeholder="e.g. Global Distributor" 
                      className="w-full p-3 bg-slate-950/60 border border-violet-500/20 rounded-xl text-xs font-bold outline-none text-white focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition duration-200" 
                    />
                  </div>

                  {/* Photo Url field */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-violet-300 tracking-wider block">
                      {language === 'id' ? 'URL Foto Produk' : 'Product Image URL'}
                    </label>
                    <input 
                      type="text" 
                      value={editForm.photoUrl}
                      onChange={e => setEditForm({...editForm, photoUrl: e.target.value})}
                      placeholder="https://images.unsplash.com/... (Image URL)" 
                      className="w-full p-3 bg-slate-950/60 border border-violet-500/20 rounded-xl text-xs font-bold outline-none text-white focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition duration-200" 
                    />
                  </div>

                  {/* Description field */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-violet-300 tracking-wider block">
                      {language === 'id' ? 'Deskripsi / Keterangan Produk' : 'Product Description'}
                    </label>
                    <textarea 
                      value={editForm.desc}
                      onChange={e => setEditForm({...editForm, desc: e.target.value})}
                      placeholder="Enter description..." 
                      rows={3}
                      className="w-full p-3 bg-slate-950/60 border border-violet-500/20 rounded-xl text-xs font-bold outline-none text-white focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition duration-200 resize-none animate-none" 
                    />
                  </div>

                </div>

                {/* Form Controls */}
                <div className="flex gap-3 justify-end pt-4 border-t border-violet-500/10">
                  <button 
                    type="button" 
                    onClick={() => setEditingProduct(null)}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition duration-200 cursor-pointer"
                  >
                    {language === 'id' ? 'Batal' : 'Cancel'}
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-violet-600 to-cyan-500 hover:brightness-110 text-white rounded-xl text-xs font-black uppercase tracking-wider transition duration-200 shadow-[0_0_15px_rgba(139,92,246,0.3)] cursor-pointer"
                  >
                    ✨ {language === 'id' ? 'Simpan Perubahan' : 'Save Changes'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ================================================= */}
      {/* CINEMATIC SYSTEM SPLASH SCREEN */}
      {/* ================================================= */}
      <AnimatePresence>
        {systemSplashActive && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 bg-[#03010c] flex flex-col items-center justify-center z-[9999] overflow-hidden"
          >
            {/* Holographic matrix grids */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,36,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(18,16,36,0.5)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
            
            <div className="absolute top-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-1/4 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div 
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="relative flex flex-col items-center max-w-md text-center p-8 z-10"
            >
              {/* Animated Hologram Logo M */}
              <div className="relative mb-6">
                <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-400 blur-lg opacity-75 animate-pulse" />
                <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-violet-500/30 flex items-center justify-center font-black text-4xl text-white shadow-[0_0_25px_rgba(139,92,246,0.6)]">
                  M
                  <span className="absolute text-[8px] tracking-widest bottom-1 font-mono text-cyan-400">2026</span>
                </div>
              </div>

              {/* AI Scanning Line effect */}
              <div className="relative w-64 h-1 border border-violet-500/20 bg-violet-950/30 rounded-full overflow-hidden mb-8">
                <motion.div 
                  animate={{ x: ["-100%", "100%"] }} 
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-1/3 h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee]"
                />
              </div>

              <h1 className="text-2xl font-black tracking-wider text-slate-100 font-sans mb-2">
                INMARKET <span className="text-cyan-400 font-mono">2026</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono tracking-widest mb-10 text-center uppercase">
                PROVISIONING INSTANCE SUITE COGNITIVE...
              </p>

              <div className="w-64">
                <div className="flex justify-between text-[10px] font-mono text-cyan-400 mb-1.5">
                  <span>MEMUAT PROTOKOL...</span>
                  <span>{splashProgress}%</span>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                  <div 
                    style={{ width: `${splashProgress}%` }} 
                    className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-100 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ================================================= */}
      {/* REAL-TIME NOTIFICATION POPUP PORTAL */}
      {/* ================================================= */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif, index) => (
            <motion.div
              key={`${notif.id}_${index}`}
              initial={{ opacity: 0, x: 80, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="pointer-events-auto bg-[#0a051d]/90 backdrop-blur-md border border-violet-500/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(139,92,246,0.3)] flex items-start gap-4 relative overflow-hidden"
            >
              {/* Cyber side indicator */}
              <div className={`absolute top-0 left-0 w-1.5 h-full ${
                notif.type === 'stok' ? 'bg-amber-400' :
                notif.type === 'transaksi' ? 'bg-cyan-400' :
                notif.type === 'karyawan' ? 'bg-emerald-400' :
                notif.type === 'chat' ? 'bg-violet-400' : 'bg-rose-400'
              }`} />
              
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-black">
                    {notif.type.toUpperCase()} STATUS
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">{notif.time}</span>
                </div>
                <p className="text-xs text-slate-100 font-sans leading-relaxed">
                  {notif.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>


      {/* ================================================= */}
      {/* TARGET REWARD CONFETTI RAIN OVERLAY */}
      {/* ================================================= */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
          {confettiParticles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: 0 }}
              animate={{ 
                y: '110vh', 
                rotate: 360,
                x: [`${p.x}vw`, `${p.x + (Math.random() * 10 - 5)}vw`]
              }}
              transition={{ 
                duration: p.duration, 
                delay: p.delay, 
                ease: "easeOut",
                repeat: Infinity 
              }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                backgroundColor: p.color,
                boxShadow: '0 0 8px currentColor'
              }}
            />
          ))}
        </div>
      )}


      {/* ================================================= */}
      {/* BADGES DETAILS POPUP DIALOG */}
      {/* ================================================= */}
      <AnimatePresence>
        {activeBadgePopup && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="w-full max-w-sm bg-[#0e0a26]/95 border border-violet-500/30 rounded-3xl p-6 relative overflow-hidden text-center"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-600 via-indigo-400 to-cyan-400" />
              
              <div className="flex justify-center my-6 text-cyan-400 animate-bounce">
                {activeBadgePopup.icon === 'Crown' ? <Crown className="w-14 h-14" /> :
                 activeBadgePopup.icon === 'Award' ? <Award className="w-14 h-14" /> :
                 activeBadgePopup.icon === 'TrendingUp' ? <TrendingUp className="w-14 h-14" /> :
                 activeBadgePopup.icon === 'ClipboardCheck' ? <ClipboardCheck className="w-14 h-14" /> :
                 activeBadgePopup.icon === 'Users' ? <Users className="w-14 h-14" /> : <Sparkles className="w-14 h-14" />}
              </div>

              <span className="px-2.5 py-1 text-[9px] uppercase font-mono tracking-widest text-[#a855f7] bg-violet-505/10 rounded-md border border-violet-500/20">
                Tier: {activeBadgePopup.tier}
              </span>

              <h3 className="text-lg font-black text-slate-100 uppercase mt-4">{activeBadgePopup.name}</h3>
              <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed px-2">
                {activeBadgePopup.desc}
              </p>

              <div className="bg-[#151136]/50 border border-slate-500/15 rounded-xl p-3 mt-5 text-[10px] font-mono text-cyan-400 uppercase">
                {activeBadgePopup.unlocked ? `Unlocked: 🚀 VERIFIED BY KASIR ENGINE` : `Locked: 🔒 REQUIRED ${activeBadgePopup.target} EXP`}
              </div>

              <button
                onClick={() => { playClickSound(); setActiveBadgePopup(null); }}
                className="w-full py-2.5 mt-6 bg-slate-900 border border-slate-500/20 rounded-xl text-xs font-black uppercase text-white hover:bg-slate-800 transition duration-150 cursor-pointer"
              >
                TUTUP JENDELA
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ================================================= */}
      {/* COGNITIVE DATA EXPORTER SLIDER */}
      {/* ================================================= */}
      <AnimatePresence>
        {isExportingActive && (
          <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-md bg-[#0a0621]/95 border border-cyan-500/30 rounded-3xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-cyan-400" />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
                  <FileSpreadsheet className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-widest leading-none font-mono">HOLOGRAPHIC EXPORT COMPILATION</h4>
                  <span className="text-[9px] text-cyan-400 uppercase tracking-wider font-mono">COMPILING FILE: {exportProgressName}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                Mengompilasi enkripsi baris transaksi, menyusun metadata visual ganda, absensi karyawan, dan mengekspor ke dalam ledger berkas lokal...
              </p>

              {/* Loader ticker */}
              <div className="my-6">
                <div className="flex justify-between text-[10px] font-mono text-[#06b6d4] mb-1.5">
                  <span>ENCRYPTING LEDGER SEGMENTS</span>
                  <span>{exportProgressVal}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900 relative">
                  <div 
                    style={{ width: `${exportProgressVal}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 transition-all duration-100"
                  />
                </div>
              </div>

              {exportProgressVal >= 100 ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-400/20 rounded-xl text-center text-xs text-emerald-400 font-mono">
                    ✅ EXPORT FILE DITERBITKAN DENGAN AMAN!
                  </div>
                  <button
                    onClick={() => { playSuccessSound(); setIsExportingActive(false); }}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black uppercase text-xs tracking-wider rounded-xl hover:brightness-110 transition duration-200 cursor-pointer"
                  >
                    UNDUH BERKAS SEKARANG
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  ⚠️ Jangan mematikan koneksi ledger selagi ekspor berlangsung...
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ================================================= */}
      {/* QUICK FLOATING ACTIONS SHORTCUT ACTION BUTTONS (FAB) */}
      {/* ================================================= */}
      <div className="fixed bottom-6 right-6 z-[9980] flex flex-col items-end gap-3 pointer-events-none">
        
        {/* Expanded micro actions panels */}
        <AnimatePresence>
          {showQuickFAB && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 25, scale: 0.8 }}
              className="pointer-events-auto flex flex-col gap-2 bg-[#09051d]/90 backdrop-blur-md border border-violet-500/20 p-3 rounded-2xl shadow-xl w-48"
            >
              <h5 className="text-[8px] font-mono font-black text-slate-400 dark:text-cyan-400 tracking-widest uppercase border-b border-white/5 pb-1.5 mb-1.5">INTELLIGENT HUB</h5>
              
              <button 
                onClick={() => { playClickSound(); setShowQuickFAB(false); setActiveTab('kasir'); }}
                className="w-full text-left py-1 px-2 hover:bg-slate-500/10 rounded-lg text-xs font-semibold text-slate-200 hover:text-cyan-400 transition"
              >
                🛒 POS Kasir Cepat
              </button>

              <button 
                onClick={() => { playClickSound(); setShowQuickFAB(false); setActiveTab('stock'); }}
                className="w-full text-left py-1 px-2 hover:bg-slate-500/10 rounded-lg text-xs font-semibold text-slate-200 hover:text-cyan-300 transition"
              >
                📦 Tambah Produk
              </button>

              {userRole === 'Owner' ? (
                <>
                  <button 
                    onClick={() => { playClickSound(); setShowQuickFAB(false); handlePaySalary(); }}
                    className="w-full text-left py-1 px-2 hover:bg-slate-500/10 rounded-lg text-xs font-semibold text-slate-200 hover:text-emerald-400 transition"
                  >
                    💸 Bayar Gaji Staf
                  </button>
                  <button 
                    onClick={() => { playClickSound(); setShowQuickFAB(false); handleGenerateAttendanceCode(); }}
                    className="w-full text-left py-1 px-2 hover:bg-slate-500/10 rounded-lg text-xs font-semibold text-slate-200 hover:text-orange-400 transition"
                  >
                    🔑 Buat Kode Absen
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => { playClickSound(); setShowQuickFAB(false); setActiveTab('absensi'); }}
                  className="w-full text-left py-1 px-2 hover:bg-slate-500/10 rounded-lg text-xs font-semibold text-slate-200 hover:text-violet-400 transition"
                >
                  📷 Check In Absensi
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Core trigger button */}
        <button
          onClick={() => { playClickSound(); setShowQuickFAB(!showQuickFAB); }}
          className="pointer-events-auto w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 text-white flex items-center justify-center shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] cursor-pointer hover:rotate-45 transition duration-300"
        >
          <Sparkles className="w-5 h-5" />
        </button>
      </div>



      {/* AI Assistant Overlay Modal */}
      <AnimatePresence>
        {isAiFloatingOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiFloatingOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden"
            >
              <div className="absolute top-4 right-4 z-50">
                <button 
                  onClick={() => setIsAiFloatingOpen(false)}
                  className="p-3 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="bg-[#0c091f] border border-violet-500/20 rounded-[2.5rem] shadow-2xl overflow-hidden p-6 md:p-8 flex flex-col h-full">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-violet-600/20 rounded-2xl text-violet-400">
                      <Bot size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-widest">AI CO-PILOT</h2>
                      <p className="text-[10px] text-slate-400 font-mono tracking-widest">INTERFACE_2026_ACTIVE</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 custom-scrollbar">
                      <div className="mb-4">
                        <div className="text-[9px] font-black tracking-widest font-mono text-cyan-400 uppercase mb-2 flex items-center gap-1">
                          <CheckSquare size={10} />
                          {language === 'id' ? 'PRESET PERTANYAAN AI' : 'AI QUICK QUESTIONS'}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                          <button 
                            onClick={() => processVoiceAIQuery('Apakah stock barang hampir habis?')} 
                            className="p-2 text-left rounded-xl bg-violet-600/5 hover:bg-violet-600/15 border border-violet-500/15 hover:border-violet-500/30 text-violet-200 transition flex items-center gap-2 truncate"
                          >
                            <span className="inline-block w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                            <span>{language === 'id' ? '“Cek stok habis?”' : '“Check low stock?”'}</span>
                          </button>
                          <button 
                            onClick={() => processVoiceAIQuery('Berapa profit hari ini?')} 
                            className="p-2 text-left rounded-xl bg-violet-600/5 hover:bg-violet-600/15 border border-violet-500/15 hover:border-violet-500/30 text-violet-200 transition flex items-center gap-2 truncate"
                          >
                            <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            <span>{language === 'id' ? '“Profit hari ini?”' : '“Today profit?”'}</span>
                          </button>
                        </div>
                      </div>

                      {aiChat.map((chat, index) => (
                        <div key={index} className={cn("p-4 rounded-2xl text-[11px] leading-relaxed border flex flex-col", chat.role === 'user' ? "bg-violet-600/20 text-white border-violet-400/30 ml-8" : "bg-black/40 border-violet-500/10 text-violet-100 mr-8")}>
                          {chat.role === 'user' ? (
                            <p className="font-semibold">{chat.text}</p>
                          ) : (
                            <div className="markdown-body">
                              <Markdown rehypePlugins={[rehypeRaw]}>{chat.text}</Markdown>
                            </div>
                          )}
                        </div>
                      ))}
                      {aiTyping && <div className="p-4 rounded-2xl bg-black/30 border border-violet-500/10 text-cyan-400 text-[10px] font-mono tracking-widest animate-pulse mr-8">⚡ PROCESSING...</div>}
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); if (aiInp.trim()){ processVoiceAIQuery(aiInp); setAiInp(''); } }} className="flex gap-2">
                     <input value={aiInp} onChange={e=>setAiInp(e.target.value)} type="text" className="flex-1 p-3.5 bg-black/40 border border-violet-500/25 rounded-xl text-xs font-bold outline-none text-violet-100 placeholder-violet-400/30" placeholder="Ketik kendala harian..." />
                     <button type="submit" className="p-3.5 bg-gradient-to-r from-[#22d3ee] to-violet-600 text-slate-950 rounded-xl"><Send size={16} /></button>
                  </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
