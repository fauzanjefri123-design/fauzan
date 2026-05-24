import React, { useState } from 'react';
import { getPartitionedKey } from '../lib/utils';
import { 
  Truck, Search, Plus, Trash2, Heart, Phone, MapPin, Package, Star, 
  Sparkles, History, Check, AlertTriangle 
} from 'lucide-react';
import { playClickSound, playSuccessSound } from '../lib/sounds';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  productsProvided: string[];
  purchaseHistory: { item: string; qty: number; cost: number; date: string }[];
  isFavorite: boolean;
}

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 's1',
    name: 'Sumatra Roast Node',
    phone: '081223344556',
    address: 'Lintong, Toba Samosir, Sumatra Utara',
    productsProvided: ['Original Premium Espresso', 'Gayo Coffee Beans', 'Mandheling Grade A'],
    purchaseHistory: [
      { item: 'Espresso Bean Roast', qty: 50, cost: 4500000, date: '25 April 2026' },
      { item: 'Special Mandheling Bag', qty: 20, cost: 2500000, date: '10 Mei 2026' }
    ],
    isFavorite: true
  },
  {
    id: 's2',
    name: 'Uji Matcha Farms Indonesia',
    phone: '085399881122',
    address: 'Kawasan Industri Jababeka, Bekasi',
    productsProvided: ['Fresh Milk Matcha Latte', 'Matcha Uji Culinary', 'Oolong Powder'],
    purchaseHistory: [
      { item: 'Organic Matcha Powder Kg', qty: 10, cost: 3500000, date: '12 Mei 2026' }
    ],
    isFavorite: true
  },
  {
    id: 's3',
    name: 'Bon Appetit Bakery',
    phone: '082188776655',
    address: 'Sunter Agung Kencana Raya, Jakarta Utara',
    productsProvided: ['Salted Caramel Croissant', 'Croissant Butter', 'Pain Au Chocolat'],
    purchaseHistory: [
      { item: 'Frozen Sliced Croissants', qty: 150, cost: 1200000, date: '19 Mei 2026' }
    ],
    isFavorite: false
  },
  {
    id: 's4',
    name: 'Earth Kitchen Co.',
    phone: '081977662211',
    address: 'Ubud Highlands, Gianyar, Bali',
    productsProvided: ['Vegan Charcoal Burger', 'Vegan Meat Patties', 'Plantmilk Soy'],
    purchaseHistory: [
      { item: 'Charcoal Charcoal Vegan Buns', qty: 80, cost: 800000, date: '15 Mei 2026' }
    ],
    isFavorite: false
  }
];

export default function SuppliersManager() {
  const { language } = useThemeLanguage();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const key = getPartitionedKey('inmarket_suppliers_data', false);
    const saved = localStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  // Adding modal states
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [productsText, setProductsText] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // AI restocking assist simulator
  const [mockShortageItem, setMockShortageItem] = useState('Original Premium Espresso');

  const saveSuppliers = (data: Supplier[]) => {
    setSuppliers(data);
    const key = getPartitionedKey('inmarket_suppliers_data', false);
    localStorage.setItem(key, JSON.stringify(data));
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const newSup: Supplier = {
      id: 'sup_' + Date.now(),
      name,
      phone,
      address,
      productsProvided: productsText ? productsText.split(',').map(p => p.trim()) : [],
      purchaseHistory: [],
      isFavorite
    };

    const updated = [...suppliers, newSup];
    saveSuppliers(updated);
    setSelectedSupplier(newSup);
    setShowAddForm(false);
    playSuccessSound();

    // Reset Form
    setName(''); setPhone(''); setAddress(''); setProductsText(''); setIsFavorite(false);
  };

  const handleDeleteSupplier = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Yakin ingin menghapus data supplier ini?')) {
      const filtered = suppliers.filter(s => s.id !== id);
      saveSuppliers(filtered);
      if (selectedSupplier?.id === id) {
        setSelectedSupplier(filtered.length > 0 ? filtered[0] : null);
      }
      playClickSound();
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = suppliers.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s);
    saveSuppliers(updated);
    if (selectedSupplier?.id === id) {
      setSelectedSupplier({ ...selectedSupplier, isFavorite: !selectedSupplier.isFavorite });
    }
    playClickSound();
  };

  // Find supplier recommendation helper if a product runs low
  const getAIRecommendation = (productName: string) => {
    // Math matching
    const matching = suppliers.find(s => 
      s.productsProvided.some(p => p.toLowerCase().includes(productName.toLowerCase()))
    );

    if (matching) {
      return {
        found: true,
        supplierName: matching.name,
        contact: matching.phone,
        reason: `Supplier ${matching.name} ${language === 'id' ? 'adalah kontak terfavorit atau termurah untuk memasok bahan terkait' : 'is the favorite or cheapest contact to supply materials related to'} "${productName}" ${language === 'id' ? 'berdasarkan akurasi histori pembelian.' : 'based on purchase history accuracy.'}`
      };
    } else {
      return {
        found: false,
        supplierName: suppliers[0]?.name || 'Sumatra Roast Node',
        contact: suppliers[0]?.phone || '081223344556',
        reason: `${language === 'id' ? 'Belum ada supplier yang secara presisi terhubung dengan kategori' : 'No supplier is precisely linked to category'} "${productName}". ${language === 'id' ? 'Kami merekomendasikan supplier utama' : 'We recommend main supplier'} (${suppliers[0]?.name || 'Sumatra Roast Node'}) ${language === 'id' ? 'sebagai alternatif pengadaan umum.' : 'as a general procurement alternative.'}`
      };
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.productsProvided.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Truck className="text-indigo-500" /> {t('rantaiPasokan')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('supplyChainInfo')}
          </p>
        </div>
        <button 
          onClick={() => { playClickSound(); setShowAddForm(true); }}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-2 transition"
        >
          <Plus size={15} /> {t('tambahSupplier')}
        </button>
      </div>

      {/* AI RESTOCK ASSISTANT FLOATING WIDGET */}
      <div className="p-4 rounded-3xl bg-[#0b051a] border border-violet-500/30 flex flex-col md:flex-row items-center gap-4 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent pointer-events-none" />
        <div className="w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/40 flex items-center justify-center shrink-0 text-violet-300">
          <Sparkles className="animate-spin" size={20} style={{ animationDuration: '6s' }} />
        </div>
        
        <div className="flex-1 space-y-2 text-center md:text-left">
          <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
            <span className="px-2 py-0.5 bg-violet-950 text-violet-400 font-mono text-[9px] rounded-full border border-violet-500/30">{t('aiSupplyCoPilot')}</span>
            <span className="text-[10px] text-zinc-400">{language === 'id' ? 'Pindai Bahan Baku Kritis' : 'Scan Critical Raw Materials'}:</span>
            <select 
              value={mockShortageItem}
              onChange={e => setMockShortageItem(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-xs px-2 py-0.5 rounded font-mono text-cyan-300 outline-none"
            >
              <option value="Original Premium Espresso">☕ Espresso Roast</option>
              <option value="Fresh Milk Matcha Latte">🍃 Matcha Powder</option>
              <option value="Salted Caramel Croissant">🥐 Butter Croissant</option>
              <option value="Vegan Charcoal Burger">🍔 Vegan Meat burger</option>
            </select>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-semibold">
            <strong className="text-emerald-400">{t('restockRec')}</strong> {getAIRecommendation(mockShortageItem).reason} ({language === 'id' ? 'Saran Kontak' : 'Contact Suggestion'}: <span className="font-mono text-cyan-400">{getAIRecommendation(mockShortageItem).contact}</span>)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left lists column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder={language === 'id' ? 'Cari supplier atau klasifikasi barang...' : 'Search supplier or goods category...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-black/5 dark:bg-white/5 border border-indigo-100/10 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-white"
            />
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-[#0c0817]/60 border border-indigo-100/10 max-h-[450px] overflow-y-auto space-y-2 custom-scrollbar">
            {filtered.map(s => {
              const isSelected = selectedSupplier?.id === s.id;
              return (
                <div 
                  key={s.id}
                  onClick={() => { playClickSound(); setSelectedSupplier(s); }}
                  className={`p-3.5 rounded-2xl border transition duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected 
                      ? "bg-indigo-650/15 border-indigo-500/50 shadow-sm" 
                      : "bg-transparent border-indigo-100/5 text-slate-600 dark:text-slate-350 hover:bg-white/5"
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-black flex items-center gap-1 text-slate-800 dark:text-white">
                      {s.name} {s.isFavorite && <Star size={11} className="fill-amber-500 text-amber-500 shrink-0" />}
                    </h4>
                    <span className="text-[10px] opacity-45 truncate block mt-0.5 font-mono">{s.address}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button 
                      onClick={(e) => toggleFavorite(s.id, e)}
                      className="p-1 rounded hover:bg-black/10"
                    >
                      <Star size={13} className={s.isFavorite ? "fill-amber-500 text-amber-500" : "text-slate-400"} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteSupplier(s.id, e)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Details column */}
        <div className="lg:col-span-7">
          {selectedSupplier ? (
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0c0817]/60 border border-indigo-100/10 space-y-6">
              <div className="flex items-center justify-between gap-3 border-b border-indigo-100/5 pb-4">
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                    {selectedSupplier.name}
                    {selectedSupplier.isFavorite && <Star className="fill-amber-400 text-amber-400" size={14} />}
                  </h3>
                  <p className="text-[10px] opacity-50 font-mono mt-0.5">Supplier ID: {selectedSupplier.id}</p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-400/20 text-indigo-500 dark:text-indigo-400 text-[10px] rounded-full font-black uppercase tracking-widest">
                  {selectedSupplier.isFavorite ? t('supplierMainFavorite') : t('regulerLogistik')}
                </span>
              </div>

              {/* Grid details stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-black/5 dark:bg-white/5 border border-indigo-100/5 rounded-xl flex items-center gap-3">
                  <Phone size={14} className="text-indigo-400" />
                  <div>
                    <span className="text-[9px] opacity-40 block font-mono">{t('kontakHubungan')}</span>
                    <strong className="text-xs font-semibold">{selectedSupplier.phone}</strong>
                  </div>
                </div>
                <div className="p-3 bg-black/5 dark:bg-white/5 border border-indigo-100/5 rounded-xl flex items-center gap-3">
                  <MapPin size={14} className="text-rose-400" />
                  <div>
                    <span className="text-[9px] opacity-40 block font-mono">{t('alamatGudangPusat')}</span>
                    <strong className="text-xs font-semibold truncate max-w-[200px] block">{selectedSupplier.address}</strong>
                  </div>
                </div>
              </div>

              {/* Products capability */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase font-mono tracking-widest opacity-40 block">{t('barangPasokan')}</span>
                <div className="flex flex-wrap gap-1.5 animate-pulse">
                  {selectedSupplier.productsProvided.map((prod, id) => (
                    <span key={id} className="text-[10px] px-2.5 py-1 bg-cyan-500/10 border border-cyan-400/20 text-cyan-600 dark:text-cyan-400 rounded-lg font-bold flex items-center gap-1.5">
                      <Package size={10} /> {prod}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sourcing History */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-black uppercase text-indigo-500 flex items-center gap-1.5">
                  <History size={12} /> {t('historiPembelianGrosir')}
                </h4>
                <div className="space-y-2">
                  {selectedSupplier.purchaseHistory.length === 0 ? (
                    <div className="p-6 text-center text-xs opacity-40 border border-dashed border-indigo-100/15 rounded-xl">
                      {t('noActivity')}
                    </div>
                  ) : (
                    selectedSupplier.purchaseHistory.map((hist, idx) => (
                      <div key={idx} className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-indigo-100/5 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">{hist.item}</strong>
                          <span className="text-[9px] opacity-40 font-mono">{language === 'id' ? 'Pemasukan' : 'Procuerement'}: Qty {hist.qty} • {hist.date}</span>
                        </div>
                        <span className="font-extrabold text-indigo-400 font-mono">Rp{hist.cost.toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-indigo-100/10 rounded-3xl bg-white/5 text-slate-400">
              <Truck size={24} className="mb-2" />
              <p className="text-xs">{t('pilihSupplierInfo')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Registration Simple Popup */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-[#090615] rounded-3xl border border-indigo-500/20 text-white space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">{t('registrasiSupplierBaru')}</h3>
              <button onClick={() => { playClickSound(); setShowAddForm(false); }} className="text-xs font-black hover:text-white">&times;</button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1">{t('namaSupplierCompany')} *</label>
                <input required type="text" placeholder={t('phInput')} value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1">{t('kontakHubungan')} *</label>
                <input required type="text" placeholder="081xxxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1">{t('alamatGudangPusat')}</label>
                <input type="text" placeholder={t('phInput')} value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 block mb-1">{t('barangPasokan')} ({language === 'id' ? 'Pisahkan dengan koma' : 'Separate with comma'})</label>
                <input type="text" placeholder={t('phInput')} value={productsText} onChange={e => setProductsText(e.target.value)} className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none" />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input type="checkbox" id="fav_sup" checked={isFavorite} onChange={e => setIsFavorite(e.target.checked)} className="rounded" />
                <label htmlFor="fav_sup" className="text-[10px] font-bold text-slate-300">{t('setSebagaiSupplierUtama')}</label>
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase">
                🚀 {t('registerSupplierKeSistem')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
