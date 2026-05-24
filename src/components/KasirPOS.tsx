import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ShoppingCart, Tag, Trash2, Plus, Minus, Check, 
  Printer, Share2, CreditCard, Landmark, Banknote, QrCode, 
  CheckCircle, AlertTriangle, RefreshCw, X, Sparkles
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { playCashRegisterSound, playClickSound, playScanSound, playSuccessSound } from '../lib/sounds';
import { toast } from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  photoUrl?: string;
  barcode?: string;
  ownerId?: string;
}

interface CartItem extends Product {
  qty: number;
}

interface KasirPOSProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  language: 'id' | 'en';
  triggerNotification: (type: string, message: string) => void;
  logSystemActivity: (actionText: string) => void;
  selectedCustomer: any | null;
  setSelectedCustomer: (cust: any | null) => void;
}

export default function KasirPOS({
  products,
  setProducts,
  language,
  triggerNotification,
  logSystemActivity,
  selectedCustomer,
  setSelectedCustomer
}: KasirPOSProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Promo code & discounts
  const [promoCode, setPromoCode] = useState('');
  const [activePromo, setActivePromo] = useState<{ code: string; type: string; value: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Transfer'>('Tunai');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState<any | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(list)];
  }, [products]);

  // Filter products by search & category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.barcode && p.barcode.includes(searchTerm));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product) => {
    playScanSound();
    if (product.stock <= 0) {
      toast.error(language === 'id' ? 'Produk habis!' : 'Out of stock!', {
        style: { background: '#1e0a1a', color: '#ff4d4d', border: '1px solid #ff4d4d' }
      });
      return;
    }

    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        toast.error(language === 'id' ? 'Stok tidak mencukupi!' : 'Insufficient stock!');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    playClickSound();
    const item = cart.find(i => i.id === id);
    if (!item) return;

    if (delta > 0 && item.qty >= item.stock) {
      toast.error(language === 'id' ? 'Stok tidak mencukupi!' : 'Insufficient stock!');
      return;
    }

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== id));
    } else {
      setCart(cart.map(i => i.id === id ? { ...i, qty: newQty } : i));
    }
  };

  const removeFromCart = (id: string) => {
    playClickSound();
    setCart(cart.filter(i => i.id !== id));
  };

  // Promo code validation
  const handleApplyPromo = () => {
    playClickSound();
    setPromoError('');
    const code = promoCode.toUpperCase().trim();
    
    // Check locally created promos from localStorage first
    let loadedPromos: any[] = [];
    try {
      const savedPromos = localStorage.getItem('inmarket_promos');
      if (savedPromos) loadedPromos = JSON.parse(savedPromos);
    } catch {}

    const promo = loadedPromos.find(p => p.code === code) || 
                  (code === 'CYBERNEON26' ? { code: 'CYBERNEON26', type: 'diskon', value: 20 } : null) ||
                  (code === 'FLASHMONDAY' ? { code: 'FLASHMONDAY', type: 'diskon', value: 50 } : null) ||
                  (code === 'KASIRCASHBACK' ? { code: 'KASIRCASHBACK', type: 'cashback', value: 15000 } : null);

    if (promo) {
      setActivePromo({
        code: promo.code,
        type: promo.type || 'diskon',
        value: Number(promo.value)
      });
      toast.success(language === 'id' ? `Promo ${code} berhasil dipasang!` : `Promo ${code} applied!`);
    } else {
      setPromoError(language === 'id' ? 'Kode tidak valid/kadaluwarsa' : 'Invalid promo code');
      setActivePromo(null);
    }
  };

  // Calculate prices
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [cart]);

  // Membership discount (Bronze 1%, Silver 2%, Gold 5%, Platinum 10%)
  const membershipDiscountAmount = useMemo(() => {
    if (!selectedCustomer) return 0;
    const tier = selectedCustomer.memberLevel || 'Bronze';
    let percent = 0.01;
    if (tier === 'Platinum') percent = 0.10;
    else if (tier === 'Gold') percent = 0.05;
    else if (tier === 'Silver') percent = 0.02;
    return subtotal * percent;
  }, [selectedCustomer, subtotal]);

  const promoDiscountAmount = useMemo(() => {
    if (!activePromo) return 0;
    if (activePromo.type === 'diskon' || activePromo.type === 'percentage') {
      return (subtotal - membershipDiscountAmount) * (activePromo.value / 100);
    }
    if (activePromo.type === 'cashback' || activePromo.type === 'flat') {
      return Math.min(activePromo.value, subtotal - membershipDiscountAmount);
    }
    return 0;
  }, [activePromo, subtotal, membershipDiscountAmount]);

  const total = useMemo(() => {
    const val = subtotal - membershipDiscountAmount - promoDiscountAmount;
    return Math.max(0, Math.round(val));
  }, [subtotal, membershipDiscountAmount, promoDiscountAmount]);

  // Cash change calculation
  const changeAmount = useMemo(() => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received < total) return 0;
    return received - total;
  }, [cashReceived, total]);

  // Checkout process
  const handleProcessTransaction = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Tunai' && (parseFloat(cashReceived) < total || isNaN(parseFloat(cashReceived)))) {
      toast.error(language === 'id' ? 'Uang diterima kurang!' : 'Insufficient cash received!');
      return;
    }

    setIsProcessing(true);
    playClickSound();

    const uId = auth.currentUser?.uid || 'anonymous_user';
    const cashierName = auth.currentUser?.displayName || auth.currentUser?.email || 'System Staff';

    const transactionData = {
      ownerId: uId,
      items: cart.map(item => ({
        productId: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price
      })),
      subtotal,
      membershipDiscount: membershipDiscountAmount,
      promoDiscount: promoDiscountAmount,
      promoCode: activePromo?.code || null,
      total,
      paymentMethod,
      cashReceived: paymentMethod === 'Tunai' ? parseFloat(cashReceived) : total,
      change: paymentMethod === 'Tunai' ? changeAmount : 0,
      cashier: cashierName,
      date: new Date().toISOString()
    };

    try {
      // 1. Try to save to Firestore
      let docRef = null;
      if (db) {
        try {
          docRef = await addDoc(collection(db, 'sales'), {
            ...transactionData,
            createdAt: serverTimestamp()
          });
        } catch (fsErr) {
          console.warn("Firestore save failed, using fallback:", fsErr);
        }
      }

      const verifiedId = docRef ? docRef.id : `receipt-${Date.now()}`;

      // 2. Reduce products stock
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) {
          const newStock = Math.max(0, p.stock - cartItem.qty);
          // Async update Firestore for each product if connected
          if (db) {
            try {
              updateDoc(doc(db, 'products', p.id), { stock: newStock });
            } catch (err) {
              console.error("Failed to update product stock in Firestore:", err);
            }
          }
          return { ...p, stock: newStock };
        }
        return p;
      });

      // Update parent list state
      setProducts(updatedProducts);

      // Save updated products and new transaction log to Offline Cache
      localStorage.setItem('inmarket_offline_products', JSON.stringify(updatedProducts));
      
      let offlineSales = [];
      try {
        const existingSales = localStorage.getItem('inmarket_offline_sales');
        if (existingSales) offlineSales = JSON.parse(existingSales);
      } catch {}
      offlineSales.unshift({ id: verifiedId, ...transactionData });
      localStorage.setItem('inmarket_offline_sales', JSON.stringify(offlineSales.slice(0, 500)));

      // 3. Log active dashboard feed / activity
      logSystemActivity(`Transaksi sukses: ${cart.length} item, total Rp${total.toLocaleString()} oleh ${cashierName}`);
      triggerNotification('SALE_SUCCESS', language === 'id' ? `Transaksi baru Rp${total.toLocaleString()} Berhasil!` : `New transaction Rp${total.toLocaleString()} Succeeded!`);

      // 4. Play cash register success chime!
      playCashRegisterSound();

      // Show digital receipt screen modal
      setShowReceipt({
        id: verifiedId,
        ...transactionData
      });

      // Clear checkout states
      setCart([]);
      setCashReceived('');
      setActivePromo(null);
      setPromoCode('');
      
    } catch (e: any) {
      console.error(e);
      toast.error(language === 'id' ? 'Gagal memproses transaksi.' : 'Transaction processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Receipt Share / Print helpers
  const handlePrint = () => {
    playClickSound();
    window.print();
  };

  const handleShareWhatsApp = () => {
    playClickSound();
    if (!showReceipt) return;
    
    const storeName = products[0] ? 'InMarket Store' : 'Toko Usaha Kami';
    let text = `=========================\n`;
    text += `   ${storeName.toUpperCase()}\n`;
    text += `=========================\n`;
    text += `No. Struk: #${showReceipt.id.slice(-6).toUpperCase()}\n`;
    text += `Kasir : ${showReceipt.cashier}\n`;
    text += `Waktu : ${new Date(showReceipt.date).toLocaleString()}\n`;
    text += `-------------------------\n`;
    
    showReceipt.items.forEach((item: any) => {
      text += `${item.name}\n  ${item.qty}x Rp${item.price.toLocaleString()} = Rp ${(item.qty * item.price).toLocaleString()}\n`;
    });
    
    text += `-------------------------\n`;
    text += `Subtotal  : Rp ${showReceipt.subtotal.toLocaleString()}\n`;
    if (showReceipt.membershipDiscount > 0) {
      text += `Disc Member: -Rp ${showReceipt.membershipDiscount.toLocaleString()}\n`;
    }
    if (showReceipt.promoDiscount > 0) {
      text += `Promo (${showReceipt.promoCode}): -Rp ${showReceipt.promoDiscount.toLocaleString()}\n`;
    }
    text += `-------------------------\n`;
    text += `TOTAL BILL: Rp ${showReceipt.total.toLocaleString()}\n`;
    text += `Metode    : ${showReceipt.paymentMethod}\n`;
    text += `Bayar     : Rp ${showReceipt.cashReceived.toLocaleString()}\n`;
    text += `Kembali   : Rp ${showReceipt.change.toLocaleString()}\n`;
    text += `=========================\n`;
    text += `Terima kasih atas kunjungan Anda!\n`;
    text += `Powered by InMarket.id`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-100 font-sans">
      
      {/* LEFT COLUMN: Catalog list (60%) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        
        {/* Search & Category Filter bar */}
        <div className="bg-[#0e0922]/80 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={language === 'id' ? 'Cari Produk / Barcode...' : 'Search Products...' }
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-cyan-500/50 transition font-bold text-xs"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar shrink-0">
            {categories.slice(0, 5).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-xl uppercase text-[9px] font-black transition cursor-pointer select-none shrink-0 ${
                  selectedCategory === cat 
                    ? 'bg-cyan-500 text-slate-900 shadow-md shadow-cyan-500/20' 
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                }`}
              >
                {cat === 'All' ? (language === 'id' ? 'Semua' : 'All') : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[640px] overflow-y-auto pr-1.5 custom-scrollbar">
          {filteredProducts.map(p => {
            const qtyInCart = cart.find(i => i.id === p.id)?.qty || 0;
            return (
              <div 
                key={p.id}
                onClick={() => addToCart(p)}
                className={`group p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  p.stock <= 0 
                    ? 'bg-red-950/20 border-red-900/10 opacity-55 saturate-50' 
                    : qtyInCart > 0 
                      ? 'bg-cyan-500/5 border-cyan-500/45 shadow-[0_0_20px_rgba(34,211,238,0.08)]' 
                      : 'bg-[#0a071d]/60 border-white/5 hover:border-violet-500/30'
                }`}
              >
                {qtyInCart > 0 && (
                  <div className="absolute top-2 right-2 px-2.5 py-1 bg-cyan-400 text-slate-900 font-extrabold text-[9px] rounded-lg shadow-md flex items-center gap-1">
                    <Check size={10} className="stroke-[3]" /> {qtyInCart} Di Keranjang
                  </div>
                )}

                <div className="flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/5 bg-slate-900">
                    <img 
                      src={p.photoUrl || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=300&auto=format&fit=crop'} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 truncate">
                    <span className="text-[8px] font-mono opacity-50 block uppercase tracking-wide">{p.category}</span>
                    <h4 className="text-xs font-black truncate leading-snug dark:text-violet-200 mt-0.5">{p.name}</h4>
                    <p className="text-sm font-black text-cyan-400 mt-1 font-mono">Rp{p.price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                  <span className={p.stock <= 5 ? 'text-rose-400 font-black animate-pulse' : 'text-slate-405 text-emerald-400'}>
                    {p.stock <= 0 
                      ? (language === 'id' ? 'HABIS' : 'SOLD_OUT') 
                      : `${language === 'id' ? 'STOK' : 'STOCK'}: ${p.stock}`
                    }
                  </span>
                  <span className="text-[8px] font-mono opacity-40">{p.barcode || 'NO_BARCODE'}</span>
                </div>
              </div>
            );
          })}
          
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 bg-[#0a071d]/30 border border-white/5 rounded-3xl text-center italic text-slate-500 text-xs">
              {language === 'id' ? 'Tidak ada produk yang cocok' : 'No matching products found'}
            </div>
          )}
        </div>

      </div>

      {/* RIGHT COLUMN: Interactive shopping basket (40%) */}
      <div className="lg:col-span-5 xl:col-span-4 p-6 bg-[#090616] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col justify-between min-h-[640px]">
        <div>
          <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#a855f7] flex items-center gap-2">
              <ShoppingCart size={16} />
              {language === 'id' ? 'KERANJANG TRANSAKSI' : 'TRANSACTION CART'}
            </h4>
            {cart.length > 0 && (
              <button 
                onClick={() => { playClickSound(); setCart([]); }}
                className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={12} /> {language === 'id' ? 'KOSONGKAN' : 'CLEAR'}
              </button>
            )}
          </div>

          {/* Membership Integration Panel */}
          <div className="mb-4">
            {selectedCustomer ? (
              <div className="p-3 bg-violet-600/15 border border-violet-500/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-300 flex items-center justify-center font-bold">
                    {selectedCustomer.name.slice(0, 1)}
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-violet-400 block tracking-wide uppercase">Member Connected</span>
                    <span className="text-xs font-black text-white">{selectedCustomer.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono font-black px-1.5 py-0.5 rounded leading-none bg-emerald-500/20 text-emerald-300 uppercase">
                    {selectedCustomer.memberLevel}
                  </span>
                  <button 
                    onClick={() => { playClickSound(); setSelectedCustomer(null); }}
                    className="p-1 text-slate-400 hover:text-rose-400 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/5 border border-dashed border-white/5 rounded-2xl text-center">
                <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-widest">NO CUSTOMER LINKED</span>
                <span className="text-[8px] opacity-40 block mt-1">Scan customer QR in helper widgets for tiered membership discounts!</span>
              </div>
            )}
          </div>

          {/* Cart list content */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {cart.map(item => (
              <div key={item.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center text-xs">
                <div className="truncate flex-1 pr-2">
                  <h5 className="font-extrabold truncate text-white leading-tight">{item.name}</h5>
                  <span className="text-[9px] opacity-50 block mt-0.5 font-mono">Rp{item.price.toLocaleString()}</span>
                </div>
                
                {/* Quantity Editor Controls */}
                <div className="flex items-center gap-2.5 shrink-0 mr-3">
                  <button 
                    onClick={() => updateQty(item.id, -1)}
                    className="w-5 h-5 rounded-md bg-white/5 border border-white/5 text-slate-300 flex items-center justify-center hover:bg-white/10"
                  >
                    <Minus size={10} />
                  </button>
                  <span className="text-xs font-mono font-black text-cyan-400">{item.qty}</span>
                  <button 
                    onClick={() => updateQty(item.id, 1)}
                    className="w-5 h-5 rounded-md bg-white/5 border border-white/5 text-slate-300 flex items-center justify-center hover:bg-white/10"
                  >
                    <Plus size={10} />
                  </button>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-black text-white font-mono">Rp{(item.price * item.qty).toLocaleString()}</p>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="text-center py-16 text-xs text-slate-500 italic">
                {language === 'id' ? 'Keranjang masih kosong.' : 'Cart is currently empty.'}
              </div>
            )}
          </div>

          {/* Promo code block */}
          {cart.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">PROMO / DISCOUNT COUPON</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value); setPromoError(''); }}
                  placeholder="Contoh: CYBERNEON26"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold outline-none uppercase focus:border-violet-500/50"
                />
                <button 
                  onClick={handleApplyPromo}
                  className="px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                >
                  APPLY
                </button>
              </div>
              {promoError && <p className="text-[10px] text-rose-400 font-bold">{promoError}</p>}
              {activePromo && (
                <div className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-bold flex items-center gap-1.5">
                  <Sparkles size={11} /> Promo Aktif: {activePromo.code} (-{activePromo.type === 'diskon' ? `${activePromo.value}%` : `Rp${activePromo.value.toLocaleString()}`})
                </div>
              )}
            </div>
          )}

        </div>

        {/* BOTTOM SECTION: Payment triggers */}
        <div className="space-y-4 border-t border-white/5 pt-4">
          
          {/* Payment method selector buttons */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-black uppercase opacity-65 font-mono block">METODE PEMBAYARAN</span>
            <div className="grid grid-cols-3 gap-2">
              {(['Tunai', 'QRIS', 'Transfer'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => { playClickSound(); setPaymentMethod(m); }}
                  className={`py-3 text-[10px] font-black uppercase rounded-2xl border flex flex-col items-center gap-1.5 cursor-pointer hover:bg-white/[0.01] transition ${
                    paymentMethod === m 
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                      : 'bg-white/5 border-white/5 text-slate-400'
                  }`}
                >
                  {m === 'Tunai' ? <Banknote size={14} /> : m === 'QRIS' ? <QrCode size={14} /> : <Landmark size={14} />}
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Cash input field if Tunai method is chosen */}
          {paymentMethod === 'Tunai' && cart.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">UANG TUNAI DITERIMA</span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                <input 
                  type="number"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  placeholder="Masukkan nominal..."
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl outline-none focus:border-cyan-500/50 text-xs font-mono font-black text-cyan-400"
                />
              </div>
              {parseFloat(cashReceived) >= total && (
                <p className="text-[10px] text-emerald-400 font-bold">
                  Kembalian: Rp{changeAmount.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Financial calculations list */}
          <div className="space-y-1.5 text-[11px] font-mono border-t border-white/5 pt-2">
            <div className="flex justify-between text-slate-500 font-bold">
              <span>SUBTOTAL</span>
              <span>Rp{subtotal.toLocaleString()}</span>
            </div>
            {membershipDiscountAmount > 0 && (
              <div className="flex justify-between text-rose-400 font-bold">
                <span>MEMBERSHIP DISC</span>
                <span>-Rp{membershipDiscountAmount.toLocaleString()}</span>
              </div>
            )}
            {promoDiscountAmount > 0 && (
              <div className="flex justify-between text-amber-400 font-bold">
                <span>PROMO DEDUCTION</span>
                <span>-Rp{promoDiscountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-[#22d3ee] font-black text-sm border-t border-dashed border-white/5 pt-1.5 mt-1.5">
              <span>GRAND TOTAL</span>
              <span>Rp{total.toLocaleString()}</span>
            </div>
          </div>

          {/* Checkout Submit trigger button */}
          <button
            onClick={handleProcessTransaction}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 disabled:opacity-40 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase hover:brightness-110 hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>PROCESSING BILL...</span>
              </>
            ) : (
              <>
                <CreditCard size={14} />
                <span>{language === 'id' ? 'PROSES TRANSAKSI' : 'FINALIZE TRANSACTION'}</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* DIGITAL RECEIPT MODAL */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowReceipt(null)} />
            <div className="relative bg-[#0c0a1a] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl space-y-5 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
              
              <div className="text-center space-y-1 print:text-black">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce print:hidden" />
                <h3 className="text-base font-black uppercase tracking-widest text-white print:text-black">
                  {language === 'id' ? 'TRANSAKSI BERHASIL' : 'TRANSACTION COMPLETED'}
                </h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  No. Struk: #{showReceipt.id.slice(-6).toUpperCase()}
                </span>
              </div>

              {/* Bill Details */}
              <div className="border-t border-b border-dashed border-white/10 py-4 font-mono text-xs text-slate-300 space-y-2 print:text-black print:border-black">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase">
                  <span>Kasir: {showReceipt.cashier}</span>
                  <span>{new Date(showReceipt.date).toLocaleDateString()}</span>
                </div>
                
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {showReceipt.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="truncate flex-1 pr-3">
                        <span className="font-bold block">{item.name}</span>
                        <span className="text-[10px] opacity-60">{item.qty}x • Rp{item.price.toLocaleString()}</span>
                      </div>
                      <span className="font-bold shrink-0">Rp{(item.qty * item.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-white/10 pt-2 space-y-1 print:border-black">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rp {showReceipt.subtotal.toLocaleString()}</span>
                  </div>
                  {showReceipt.membershipDiscount > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Disc Member</span>
                      <span>-Rp {showReceipt.membershipDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {showReceipt.promoDiscount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Promo ({showReceipt.promoCode})</span>
                      <span>-Rp {showReceipt.promoDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-cyan-400 text-sm border-t border-dashed border-white/10 pt-1.5 mt-1.5 print:text-black print:border-black">
                    <span>TOTAL BILL</span>
                    <span>Rp {showReceipt.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] opacity-75">
                    <span>Metode Bayar</span>
                    <span className="uppercase">{showReceipt.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-[10px] opacity-75">
                    <span>Uang Diterima</span>
                    <span>Rp {showReceipt.cashReceived.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-emerald-400">
                    <span>Kembalian</span>
                    <span>Rp {showReceipt.change.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action operations */}
              <div className="grid grid-cols-2 gap-3 pt-2 print:hidden">
                <button 
                  onClick={handleShareWhatsApp}
                  className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2"
                >
                  <Share2 size={13} />
                  <span>WhatsApp</span>
                </button>
                <button 
                  onClick={handlePrint}
                  className="py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2"
                >
                  <Printer size={13} />
                  <span>Print Receipt</span>
                </button>
              </div>

              <button 
                onClick={() => setShowReceipt(null)}
                className="w-full py-3.5 border border-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition print:hidden cursor-pointer"
              >
                Close Receipt
              </button>

            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
