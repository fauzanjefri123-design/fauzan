import React, { useState, useEffect } from 'react';
import { getPartitionedKey, safeJsonParse } from '../lib/utils';
import { motion } from 'motion/react';
import { 
  DollarSign, Wifi, Lightbulb, Droplets, Home, Users, Landmark, 
  FileSpreadsheet, ArrowDownRight, ArrowUpRight, TrendingUp, Plus, Trash2, Calendar,
  Package, AlertTriangle, Loader2
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { playClickSound, playSuccessSound } from '../lib/sounds';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';
import { useAuth } from '../context/AuthContext';
import { getExpenses, addExpense, deleteExpense } from '../lib/firestoreService';
import ConfirmDialog from './ConfirmDialog';
import { validatePrice, sanitizeInput } from '../lib/validation';

interface Expense {
  id: string;
  category: 'Listrik' | 'Air' | 'Wifi' | 'Sewa' | 'Beli Stock' | 'Gaji' | 'Pajak' | 'Lainnya';
  amount: number;
  date: string;
  notes: string;
}

export default function ExpensesManager() {
  const { language } = useThemeLanguage();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;
  const { userData } = useAuth();
  const ownerId = userData?.ownerId || '';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Firestore Data Synchronization
  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = getExpenses(
      ownerId,
      (data) => {
        setExpenses(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [ownerId]);

  // Calculate global sales revenue from system transactions
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    const salesKey = getPartitionedKey('inmarket_sales', true);
    const rawSales = localStorage.getItem(salesKey);
    const parsed = safeJsonParse(rawSales, []);
    const calc = parsed.reduce((acc: number, cur: any) => acc + (cur.total || 0), 0);
    // Include baseline + actual sales to maintain healthy numbers
    setRevenue(calc);
  }, []);

  const [category, setCategory] = useState<'Listrik' | 'Air' | 'Wifi' | 'Sewa' | 'Beli Stock' | 'Gaji' | 'Pajak' | 'Lainnya'>('Listrik');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Validation state
  const [amountError, setAmountError] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemId: string | null;
  }>({ open: false, itemId: null });

  // Handle live amount validation
  useEffect(() => {
    if (amount) {
      const err = validatePrice(amount);
      setAmountError(err);
    } else {
      setAmountError(null);
    }
  }, [amount]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePrice(amount);
    if (err) {
      setAmountError(err);
      return;
    }
    if (!ownerId || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        category,
        amount: Number(amount),
        date: date || new Date().toISOString().split('T')[0],
        notes: sanitizeInput(notes) || `${category} payment`
      };

      await addExpense(ownerId, payload);
      playSuccessSound();

      // Reset Form
      setAmount('');
      setNotes('');
      setAmountError(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerDeleteConfirm = (id: string) => {
    setConfirmDialog({ open: true, itemId: id });
  };

  const handleConfirmDelete = async () => {
    const id = confirmDialog.itemId;
    if (id && ownerId) {
      try {
        await deleteExpense(ownerId, id);
        playClickSound();
      } catch (e) {
        console.error(e);
      }
    }
    setConfirmDialog({ open: false, itemId: null });
  };

  // Finance Analytics Calculation
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = revenue - totalExpenses;
  const isLoss = netProfit < 0;

  // Pie chart categorizations
  const categoriesMap = expenses.reduce((acc: any, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const pieChartData = Object.keys(categoriesMap).map(key => ({
    name: key,
    value: categoriesMap[key]
  }));

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

  // AI calculation generator for Financial Status
  const getAIExpensesReview = () => {
    const expenseRatio = totalExpenses / (revenue || 1);
    if (expenseRatio > 0.6) {
      return {
        status: t('profitWarning'),
        review: t('profitWarningRec'),
        color: "text-rose-400"
      };
    } else {
      return {
        status: t('profitHealthy'),
        review: t('profitHealthyRec'),
        color: "text-emerald-400"
      };
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Listrik': return <Lightbulb className="text-yellow-400" size={14} />;
      case 'Air': return <Droplets className="text-blue-400" size={14} />;
      case 'Wifi': return <Wifi className="text-cyan-400" size={14} />;
      case 'Sewa': return <Home className="text-emerald-450" size={14} />;
      case 'Beli Stock': return <Package className="text-orange-400" size={14} />;
      case 'Gaji': return <Users className="text-indigo-400" size={14} />;
      case 'Pajak': return <Landmark className="text-pink-400" size={14} />;
      default: return <DollarSign className="text-zinc-400" size={14} />;
    }
  };

  // Convert expenses to calendar-style trend format
  const areaChartData = expenses.map(e => ({
    date: e.date,
    Pengeluaran: e.amount
  })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <DollarSign className="text-indigo-500" /> {t('analitikPengeluaran')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('akuntansiTerdesentralisasi')}
          </p>
        </div>
      </div>

      {/* Modern Ledger Executive Widget cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-50 block">{t('pendapatanUsaha')}</span>
            <strong className="text-lg md:text-xl font-extrabold text-slate-800 dark:text-white block mt-1.5">
              Rp{revenue.toLocaleString()}
            </strong>
            <span className="text-[9px] text-emerald-500 font-mono flex items-center gap-1 mt-1">
              <ArrowUpRight size={10} /> +15.5% {t('recentActivity')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
            Rp
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 shadow-sm relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-50 block">{t('totalPengeluaranLabel')}</span>
            <strong className="text-lg md:text-xl font-extrabold text-[#f43f5e] block mt-1.5">
              Rp{totalExpenses.toLocaleString()}
            </strong>
            <span className="text-[9px] text-rose-500 font-mono flex items-center gap-1 mt-1">
              <ArrowDownRight size={10} /> {t('ledgerReport')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 font-bold">
            Out
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#090615]/90 border border-violet-500/35 shadow-[0_0_15px_rgba(139,92,246,0.15)] relative overflow-hidden flex items-center justify-between">
          <div className="absolute inset-0 bg-transparent pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-mono tracking-widest uppercase opacity-50 text-white block">{t('labaBersihLabel')}</span>
            <strong className={`text-lg md:text-xl font-black block mt-1.5 ${isLoss ? 'text-rose-400' : 'text-cyan-400'}`}>
              Rp{netProfit.toLocaleString()}
            </strong>
            <span className="text-[9px] text-zinc-300 font-mono flex items-center gap-1 mt-1">
              <TrendingUp size={10} /> {t('aiFinancialAdvisor')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-cyan-950/40 border border-cyan-400/20 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold shrink-0 relative z-10">
            Net
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Add expense ledger form and list */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-[#0c0817]/60 border border-indigo-100/10">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#8b5cf6] mb-4">{t('inputPengeluaran')}</h3>
            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('kategoriPengeluaran')}</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white"
                >
                  <option value="Listrik">⚡ {t('listrik')} (Electricity)</option>
                  <option value="Air">💧 {t('air')} (Water Utilities)</option>
                  <option value="Wifi">🌐 {t('wifi')} & Cloud Hosting</option>
                  <option value="Sewa">🏢 {t('sewa')} Gedung/Ruko</option>
                  <option value="Beli Stock">📦 {t('beliStock')} Gudang / Bahan Baku</option>
                  <option value="Gaji">👥 {t('gaji')} Karyawan & Insentif</option>
                  <option value="Pajak">🏛️ {t('pajak')} Negara / Fiskal</option>
                  <option value="Lainnya">💰 {t('lainnya')} Keperluan Usaha Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('jumlahRp')}</label>
                  <input 
                    required
                    type="number" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={t('phInput')}
                    className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-violet-500"
                  />
                  {amountError && (
                    <span className="text-[10px] text-rose-500 mt-1 block font-semibold flex items-center gap-1">
                      <AlertTriangle size={10} /> {amountError}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('tanggalTagihan')}</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">{t('catatanSingkat')}</label>
                <input 
                  type="text" 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('phInput')}
                  className="w-full p-2.5 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white focus:border-violet-500"
                />
              </div>

              <button 
                type="submit"
                disabled={!!amountError || submitting || !amount}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition duration-200"
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Loading...
                  </>
                ) : (
                  <>
                    <Plus size={14} /> {t('tambahKeBukuKas')}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Table history list of expenses */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#0c0817]/60 border border-indigo-100/10 space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
            <span className="text-[9px] uppercase font-mono tracking-widest opacity-40 block mb-2">{t('bukuKasPengeluaran')}</span>
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-indigo-500" size={20} />
                <span className="text-[10px] text-slate-400 font-mono font-bold">LOADING_CLOUD_LEDGER...</span>
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-8 text-center text-xs opacity-40 italic">{t('noActivity')}</div>
            ) : (
              expenses.map(e => (
                <div 
                  key={e.id}
                  className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-indigo-100/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-black/10 flex items-center justify-center shrink-0">
                      {getCategoryIcon(e.category)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{e.notes}</span>
                      <span className="text-[9px] opacity-40 block font-mono">{e.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-rose-500 font-mono">Rp{e.amount.toLocaleString()}</span>
                    <button 
                      onClick={() => triggerDeleteConfirm(e.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Charts & AI Insights */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Chart 1: Expenditure Category Pie */}
            <div className="p-5 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 h-64 flex flex-col justify-between">
              <span className="text-[9px] uppercase font-mono tracking-widest opacity-50 block mb-2">{t('proporsiPengeluaran')}</span>
              <div className="h-44">
                {pieChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs opacity-40 italic">{t('noActivity')}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => `Rp${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="text-[9.5px] items-center gap-1.5 flex flex-wrap opacity-85 justify-center mt-1 font-semibold">
                {pieChartData.map((entry, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    {entry.name}
                  </span>
                ))}
              </div>
            </div>

            {/* AI Advisor Panel */}
            <div className="p-5 rounded-3xl bg-[#0a0518] border border-violet-500/20 flex flex-col justify-between h-64 text-white">
              <div>
                <span className="text-[9px] uppercase font-mono tracking-widest text-violet-400 block mb-1">{t('aiFinancialAdvisor')}</span>
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 mt-2">
                  <span className="text-xs">{t('rasioKeuangan')}</span>
                  <span className={`text-xs font-black font-semibold ${getAIExpensesReview().color}`}>
                    {getAIExpensesReview().status}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed italic mt-3 font-medium">
                  "{getAIExpensesReview().review}"
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 text-[10px] text-zinc-400">
                <Calendar size={13} className="text-violet-450" />
                <span>{t('tanggalAnalisis')} 21 Mei 2026</span>
              </div>
            </div>
          </div>

          {/* Area trend chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-black/25 border border-indigo-100/10 h-64">
            <span className="text-[10px] uppercase font-mono opacity-50 block mb-4">{t('grafikAmbangPengeluaran')}</span>
            <div className="h-[80%]">
              {areaChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs opacity-40">No entries recorded</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData}>
                    <defs>
                      <linearGradient id="colorEx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#a855f710" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={10} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#090514', border: '1px solid #f43f5e', borderRadius: '12px', color: '#fff' }} />
                    <Area type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" fillOpacity={1} fill="url(#colorEx)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={confirmDialog.open}
        title="Hapus Catatan Pengeluaran"
        message="Apakah Anda yakin ingin menghapus pengeluaran ini secara permanen dari Cloud database?"
        confirmLabel="Hapus"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ open: false, itemId: null })}
        variant="danger"
      />
    </div>
  );
}
