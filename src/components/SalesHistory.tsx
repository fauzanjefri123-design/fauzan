import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  Search, Calendar, Download, ChevronLeft, ChevronRight, Filter, 
  DollarSign, ShoppingBag, TrendingUp, Award, Clock, HelpCircle, 
  Tag, RefreshCw, Layers, CreditCard
} from 'lucide-react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';
import { playClickSound, playSuccessSound } from '../lib/sounds';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';

interface SaleItem {
  productId?: string;
  name: string;
  qty: number;
  quantity?: number; // legacy fallback
  price: number;
  pricePerUnit?: number; // legacy fallback
}

interface SaleRecord {
  id: string;
  ownerId: string;
  items?: SaleItem[];
  productName?: string; // legacy fallback
  name?: string; // legacy fallback
  quantity?: number; // legacy fallback
  pricePerUnit?: number; // legacy fallback
  subtotal?: number;
  membershipDiscount?: number;
  promoDiscount?: number;
  promoCode?: string | null;
  total: number;
  paymentMethod?: string;
  cashReceived?: number;
  change?: number;
  cashier?: string;
  date?: string;
  category?: string; // legacy fallback for single product
}

export default function SalesHistory() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [cashierFilter, setCashierFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Expandable list state (expanded receipts)
  const [expandedReceipts, setExpandedReceipts] = useState<Record<string, boolean>>({});

  const { language } = useThemeLanguage();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;
  
  // Real-time or fetch sales ledger
  const fetchSales = async () => {
    setLoading(true);
    let firestoreSales: SaleRecord[] = [];
    
    // 1. Load from offline cache first (so the UI updates immediately)
    let offlineSales: SaleRecord[] = [];
    try {
      const savedSales = localStorage.getItem('inmarket_offline_sales');
      if (savedSales) {
        offlineSales = JSON.parse(savedSales);
      }
    } catch (e) {
      console.warn("Could not read offline sales:", e);
    }

    // 2. Load from Firebase if verified
    try {
      if (auth.currentUser) {
        const q = query(
          collection(db, 'sales'),
          where('ownerId', '==', auth.currentUser.uid),
          orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        if (snapshot && snapshot.docs) {
          firestoreSales = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as SaleRecord[];
        }
      }
    } catch (e) {
      console.warn("Firestore sales fetch failed, utilizing cached sales:", e);
    }

    // Merge offline sales & firestore sales uniquely by ID
    const mergedMap = new Map<string, SaleRecord>();
    
    // Add firestore records first
    firestoreSales.forEach(s => mergedMap.set(s.id, s));
    // Add offline records if they don't already exist
    offlineSales.forEach(s => {
      if (!mergedMap.has(s.id)) {
        mergedMap.set(s.id, s);
      }
    });

    // Array output sorted by date desc
    const sortedResult = Array.from(mergedMap.values()).sort((a, b) => {
      const tA = a.date ? new Date(a.date).getTime() : 0;
      const tB = b.date ? new Date(b.date).getTime() : 0;
      return tB - tA;
    });

    setSales(sortedResult);
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
  }, [auth.currentUser]);

  // Handle dropdown expand state
  const toggleExpand = (recordId: string) => {
    playClickSound();
    setExpandedReceipts(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Extract list of Cashiers & Categories dynamically for filter drop-downs
  const filtersData = useMemo(() => {
    const cashiersSet = new Set<string>();
    const categoriesSet = new Set<string>();
    
    sales.forEach(s => {
      if (s.cashier) cashiersSet.add(s.cashier);
      
      // Items list categories
      if (s.items) {
        // Categories can't be easily retrieved unless items contain it, fallback
      } else if (s.category) {
        categoriesSet.add(s.category);
      }
    });

    return {
      cashiers: Array.from(cashiersSet),
      categories: Array.from(categoriesSet)
    };
  }, [sales]);

  // Client-side analytics/stats metrics
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // 1. General search (receipt ID, cashier, fallback item names, promo code)
      const receiptMatches = s.id.toLowerCase().includes(searchTerm.toLowerCase());
      const cashierMatches = s.cashier?.toLowerCase().includes(searchTerm.toLowerCase());
      const promoMatches = s.promoCode?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Product Name Match in items
      let productMatches = false;
      if (s.items && s.items.length > 0) {
        productMatches = s.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      } else {
        const legacyName = s.productName || s.name || '';
        productMatches = legacyName.toLowerCase().includes(searchTerm.toLowerCase());
      }

      const matchesSearch = receiptMatches || cashierMatches || promoMatches || productMatches;

      // 2. Date ranges filtering
      let matchesDate = true;
      if (s.date) {
        const recordTime = new Date(s.date).getTime();
        if (startDate) {
          const startLimit = new Date(startDate).setHours(0, 0, 0, 0);
          if (recordTime < startLimit) matchesDate = false;
        }
        if (endDate) {
          const endLimit = new Date(endDate).setHours(23, 59, 59, 999);
          if (recordTime > endLimit) matchesDate = false;
        }
      }

      // 3. Dropdown Filters
      const matchesPayment = paymentMethodFilter === 'All' || s.paymentMethod === paymentMethodFilter;
      const matchesCashier = cashierFilter === 'All' || s.cashier === cashierFilter;
      
      let matchesCategory = true;
      if (categoryFilter !== 'All') {
        if (s.category) {
          matchesCategory = s.category === categoryFilter;
        } else {
          matchesCategory = false; // Cannot filter multi-item by flat category
        }
      }

      return matchesSearch && matchesDate && matchesPayment && matchesCashier && matchesCategory;
    });
  }, [sales, searchTerm, startDate, endDate, paymentMethodFilter, cashierFilter, categoryFilter]);

  // Dynamic calculations for aggregate metrics cards
  const metrics = useMemo(() => {
    let rawTotalSalesPrice = 0;
    let totalItemsSold = 0;
    
    filteredSales.forEach(s => {
      rawTotalSalesPrice += s.total || 0;
      
      if (s.items) {
        s.items.forEach(item => {
          totalItemsSold += item.qty || item.quantity || 1;
        });
      } else {
        totalItemsSold += s.quantity || 1;
      }
    });

    const totalBillsCount = filteredSales.length;
    const averageBasketVal = totalBillsCount > 0 ? Math.round(rawTotalSalesPrice / totalBillsCount) : 0;

    return {
      revenue: rawTotalSalesPrice,
      count: totalBillsCount,
      average: averageBasketVal,
      productsQty: totalItemsSold
    };
  }, [filteredSales]);

  // Export CSV functionality with papaparse
  const handleExportCSV = () => {
    playSuccessSound();
    if (filteredSales.length === 0) {
      toast.error(language === 'id' ? 'Tidak ada data untuk diekspor!' : 'No data to export!');
      return;
    }

    // Map fields cleanly to flat JSON format for spreadsheet readers
    const mappedRows = filteredSales.flatMap(s => {
      const formatedDate = s.date ? new Date(s.date).toLocaleString([], { hour12: false }) : '';
      
      if (s.items && s.items.length > 0) {
        return s.items.map((item, idx) => ({
          'Struk ID': s.id.slice(-8).toUpperCase(),
          'Waktu': formatedDate,
          'Kasir': s.cashier || 'System',
          'Metode Bayar': s.paymentMethod || 'TUNAI',
          'Nama Produk': item.name,
          'Qty': item.qty,
          'Harga': item.price,
          'Subtotal': item.price * item.qty,
          'Diskon Member': idx === 0 ? (s.membershipDiscount || 0) : 0,
          'Diskon Kupon': idx === 0 ? (s.promoDiscount || 0) : 0,
          'Kode Promo': idx === 0 ? (s.promoCode || '-') : '-',
          'Grand Total Bill': idx === 0 ? s.total : 0
        }));
      } else {
        // legacy records format
        return [{
          'Struk ID': s.id.slice(-8).toUpperCase(),
          'Waktu': formatedDate,
          'Kasir': s.cashier || 'System',
          'Metode Bayar': 'TUNAI',
          'Nama Produk': s.productName || s.name || 'Custom Varian',
          'Qty': s.quantity || 1,
          'Harga': s.pricePerUnit || s.total || 0,
          'Subtotal': (s.pricePerUnit || s.total || 0) * (s.quantity || 1),
          'Diskon Member': 0,
          'Diskon Kupon': 0,
          'Kode Promo': '-',
          'Grand Total Bill': s.total || 0
        }];
      }
    });

    const csvOutput = Papa.unparse(mappedRows);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `InMarket_Sales_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(
      language === 'id' ? 'Laporan penjualan berhasil diekspor ke CSV!' : 'Sales report exported to CSV!'
    );
  };

  // Client Side local pagination slices
  const totalPagesCount = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  
  const paginatedSalesRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      playClickSound();
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPagesCount) {
      playClickSound();
      setCurrentPage(prev => prev + 1);
    }
  };

  // Reset page layout on filter update
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentMethodFilter, cashierFilter, categoryFilter, startDate, endDate]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      
      {/* TITLE & EXPORT HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest text-[#a855f7] flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-400" />
            {language === 'id' ? 'RIWAYAT & AUDIT TRANSAKSI' : 'TRANSACTION HISTORY & AUDIT'}
          </h2>
          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wide">
            {language === 'id' 
              ? 'Tinjau penjualan produk, rincian diskon member, dan kasir penanggung jawab' 
              : 'Audit customer sales, linked coupon discounts and server cashier performance'}
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => { playClickSound(); fetchSales(); }}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-center transition"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="px-4 py-2.5 bg-[#8b5cf6]/90 hover:bg-[#7c3aed] text-white disabled:opacity-40 rounded-2xl font-black text-[9px] tracking-widest uppercase transition flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-500/10"
          >
            <Download size={13} />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* METRICS / STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#090616] border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-3 right-3 p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <DollarSign size={14} />
          </div>
          <div>
            <span className="text-[8px] font-mono font-black text-slate-500 block uppercase tracking-widest">{t('totalRevenue')}</span>
            <p className="text-base font-black text-cyan-400 mt-1 font-mono">Rp{metrics.revenue.toLocaleString()}</p>
          </div>
          <span className="text-[8px] text-emerald-400 mt-2 block font-extrabold uppercase">● {language === 'id' ? 'TERFILTER' : 'FILTERED'}</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#090616] border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-3 right-3 p-1.5 bg-violet-500/10 text-violet-400 rounded-lg">
            <ShoppingBag size={14} />
          </div>
          <div>
            <span className="text-[8px] font-mono font-black text-slate-500 block uppercase tracking-widest">{language === 'id' ? 'JUMLAH TRANSAKSI' : 'TOTAL SALES COUNT'}</span>
            <p className="text-base font-black text-white mt-1 font-mono">{metrics.count} Struk</p>
          </div>
          <span className="text-[8px] text-slate-400 mt-2 block font-medium uppercase">{language === 'id' ? 'Tertulis di cloud' : 'Registered sales'}</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#090616] border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-3 right-3 p-1.5 bg-pink-500/10 text-pink-400 rounded-lg">
            <TrendingUp size={14} />
          </div>
          <div>
            <span className="text-[8px] font-mono font-black text-slate-500 block uppercase tracking-widest">{language === 'id' ? 'RATA-RATA BELANJA' : 'AVERAGE CART VALUE'}</span>
            <p className="text-base font-black text-pink-400 mt-1 font-mono">Rp{metrics.average.toLocaleString()}</p>
          </div>
          <span className="text-[8px] text-slate-400 mt-2 block font-medium uppercase">Value per Invoice</span>
        </div>

        <div className="p-5 rounded-3xl bg-[#090616] border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-3 right-3 p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <Layers size={14} />
          </div>
          <div>
            <span className="text-[8px] font-mono font-black text-slate-500 block uppercase tracking-widest">{language === 'id' ? 'PRODUK TERPINDAI' : 'TOTAL ITEMS SOLD'}</span>
            <p className="text-base font-black text-amber-400 mt-1 font-mono">{metrics.productsQty} Unit</p>
          </div>
          <span className="text-[8px] text-slate-405 text-emerald-400 mt-2 block font-extrabold uppercase">● SUCCESS STOCK-OUT</span>
        </div>
      </div>

      {/* FILTER CONTROL CONSOLE */}
      <div className="bg-[#0e0922]/70 border border-white/10 p-5 rounded-3xl backdrop-blur-xl space-y-4">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Main search bar query */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={language === 'id' ? 'Cari ID struk, nama kasir, produk, kupon...' : 'Search receipt ID, cashier, product or coupon...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold outline-none focus:border-cyan-500/30 transition uppercase"
            />
          </div>

          {/* Date range pickers */}
          <div className="md:col-span-7 grid grid-cols-2 gap-2">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[8px] font-mono font-black text-slate-500 uppercase">Start</span>
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full pl-12 pr-2 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold outline-none font-mono focus:border-cyan-500/30 text-[#22d3ee]"
              />
            </div>
            
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[8px] font-mono font-black text-slate-500 uppercase">End</span>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full pl-12 pr-2 py-2.5 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold outline-none font-mono focus:border-cyan-500/30 text-[#22d3ee]"
              />
            </div>
          </div>

        </div>

        {/* Dropdowns details sorting row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/5 pt-4">
          
          <div>
            <label className="text-[8px] font-mono font-black uppercase text-slate-500 block mb-1.5 tracking-wider">PAYMENT METHOD</label>
            <select
              value={paymentMethodFilter}
              onChange={e => setPaymentMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold outline-none border-dashed focus:border-violet-500/30"
            >
              <option value="All">All Methods ({language === 'id' ? 'Semua' : 'All'})</option>
              <option value="Tunai">Tunai / Cash</option>
              <option value="QRIS">QRIS / E-Money</option>
              <option value="Transfer">Transfer Bank</option>
            </select>
          </div>

          <div>
            <label className="text-[8px] font-mono font-black uppercase text-slate-500 block mb-1.5 tracking-wider">CASHIER / STAFF</label>
            <select
              value={cashierFilter}
              onChange={e => setCashierFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold outline-none border-dashed focus:border-violet-500/30"
            >
              <option value="All">All Staffs ({language === 'id' ? 'Semua' : 'All'})</option>
              {filtersData.cashiers.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Legacy single product category filter fallback */}
          <div>
            <label className="text-[8px] font-mono font-black uppercase text-slate-505 text-slate-500 block mb-1.5 tracking-wider">LEGACY CATEGORY</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold outline-none border-dashed focus:border-violet-500/30"
            >
              <option value="All">All Categories ({language === 'id' ? 'Semua' : 'All'})</option>
              {filtersData.categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>
        
      </div>

      {/* COMPACT REAL-TIME ACCORDION TABLE VIEW */}
      <div className="bg-[#090616] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        
        {loading ? (
          <div className="p-20 text-center text-sm font-semibold flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-purple-400" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Loading sales records...</span>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-20 text-center italic text-slate-500 text-xs">
            {language === 'id' ? 'Tidak ada kecocokan riwayat audit transaksi.' : 'No matching sales records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[9px] uppercase font-mono text-slate-500 tracking-wider bg-white/[0.01]">
                  <th className="py-4 px-5">Receipt ID</th>
                  <th className="py-4 px-4">{language === 'id' ? 'Waktu & Tanggal' : 'Timestamp'}</th>
                  <th className="py-4 px-4">{language === 'id' ? 'Pelaksana Kasir' : 'Cashier'}</th>
                  <th className="py-4 px-4">{language === 'id' ? 'Cara Bayar' : 'Payment Method'}</th>
                  <th className="py-4 px-4 text-right">Items qty</th>
                  <th className="py-4 px-5 text-right">Grand Total</th>
                  <th className="py-4 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedSalesRecords.map(s => {
                  const isExpanded = !!expandedReceipts[s.id];
                  
                  // Calculate total items qty
                  let totalQty = 0;
                  if (s.items) {
                    s.items.forEach(item => totalQty += item.qty || item.quantity || 1);
                  } else {
                    totalQty = s.quantity || 1;
                  }

                  return (
                    <React.Fragment key={s.id}>
                      <tr className="hover:bg-white/[0.01]">
                        <td className="py-3 px-5 font-mono font-black text-cyan-400 uppercase">
                          #{s.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-300">
                          {s.date ? new Date(s.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-300">
                          {s.cashier || 'System'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            s.paymentMethod === 'QRIS' 
                              ? 'bg-purple-500/10 text-purple-400' 
                              : s.paymentMethod === 'Transfer' 
                                ? 'bg-amber-500/10 text-amber-400' 
                                : 'bg-green-500/10 text-green-400'
                          }`}>
                            {s.paymentMethod || 'TUNAI'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {totalQty} items
                        </td>
                        <td className="py-3 px-5 text-right font-black font-mono text-white text-sm">
                          Rp{(s.total || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            onClick={() => toggleExpand(s.id)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-300 cursor-pointer"
                          >
                            {isExpanded ? (language === 'id' ? 'Sembunyikan' : 'Hide') : (language === 'id' ? 'Rincian' : 'Details')}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable detailed drawer/receipt item lists row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-white/[0.01] border-l-2 border-cyan-500">
                            <div className="p-5 font-mono text-[11px] text-slate-300 space-y-3.5 divide-y divide-white/5">
                              
                              <div className="flex flex-col sm:flex-row justify-between pb-3 relative">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">INMARKET DIGITAL AUDIT PROTOCOL</span>
                                  <p className="text-white font-extrabold">{s.cashier || 'System Staff'} • {s.date ? new Date(s.date).toUTCString() : '-'}</p>
                                </div>
                                <div className="text-right text-[10px] mt-2 sm:mt-0 font-bold space-y-0.5">
                                  {s.promoCode && (
                                    <p className="text-yellow-400 uppercase tracking-wider flex items-center justify-end gap-1"><Tag size={12} /> PROMO APPLIED: {s.promoCode}</p>
                                  )}
                                  <p className="text-slate-400 font-mono">Invoice reference lookup: {s.id}</p>
                                </div>
                              </div>

                              <div className="pt-3.5 space-y-2 max-w-2xl">
                                <span className="text-[9px] font-black text-[#8b5cf6] uppercase tracking-widest block">ITEMIZED LISTS</span>
                                
                                {s.items && s.items.length > 0 ? (
                                  s.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-1">
                                      <div className="flex-1 truncate">
                                        <p className="font-bold text-white leading-tight">{item.name}</p>
                                        <span className="text-[9px] text-slate-500 block">{item.qty} unit x Rp{item.price.toLocaleString()}</span>
                                      </div>
                                      <span className="text-cyan-400 font-black">Rp{(item.price * item.qty).toLocaleString()}</span>
                                    </div>
                                  ))
                                ) : (
                                  // legacy fallback representation
                                  <div className="flex justify-between items-center py-1">
                                    <div className="flex-1">
                                      <p className="font-bold text-white">{s.productName || s.name || 'Varian Produk'}</p>
                                      <span className="text-[9px] text-slate-500 block">{(s.quantity || 1)} unit x Rp{(s.pricePerUnit || s.total || 0).toLocaleString()}</span>
                                    </div>
                                    <span className="text-cyan-400 font-black">Rp{(s.total || 0).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-3.5 flex flex-col items-end gap-1 relative text-[10px] font-bold">
                                {s.subtotal !== undefined && (
                                  <div className="flex justify-between w-56 text-slate-500">
                                    <span>SUBTOTAL</span>
                                    <span>Rp{s.subtotal.toLocaleString()}</span>
                                  </div>
                                )}
                                {s.membershipDiscount !== undefined && s.membershipDiscount > 0 && (
                                  <div className="flex justify-between w-56 text-rose-400">
                                    <span>DISCOUNT MEMBER</span>
                                    <span>-Rp{s.membershipDiscount.toLocaleString()}</span>
                                  </div>
                                )}
                                {s.promoDiscount !== undefined && s.promoDiscount > 0 && (
                                  <div className="flex justify-between w-56 text-yellow-400">
                                    <span>COUPON DEDUCTION</span>
                                    <span>-Rp{s.promoDiscount.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between w-56 text-sm font-black text-white border-t border-dashed border-white/10 pt-1.5 mt-1">
                                  <span>GRAND TOTAL</span>
                                  <span className="text-cyan-400">Rp{s.total.toLocaleString()}</span>
                                </div>
                                
                                {s.paymentMethod === 'Tunai' && s.cashReceived !== undefined && (
                                  <div className="opacity-80 flex flex-col items-end mt-1 text-[9px] text-slate-500 font-bold space-y-0.5">
                                    <span>BAYAR CASH: Rp{s.cashReceived.toLocaleString()}</span>
                                    <span>KEMBALIAN: Rp{(s.change || 0).toLocaleString()}</span>
                                  </div>
                                )}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {filteredSales.length > 0 && (
          <div className="p-4 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] font-bold">
            <span className="text-slate-400">
              {language === 'id' ? 'Menampilkan' : 'Showing'} {Math.min(filteredSales.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredSales.length, currentPage * itemsPerPage)} {language === 'id' ? 'dari' : 'of'} {filteredSales.length} {language === 'id' ? 'transaksi' : 'transactions'}
            </span>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer text-slate-300"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="font-mono text-slate-300">
                {currentPage} / {totalPagesCount}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPagesCount}
                className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer text-slate-300"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

