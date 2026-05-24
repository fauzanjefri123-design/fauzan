import React from 'react';
import { Package, ShoppingCart, ClipboardCheck, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function QuickActions({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const actions = [
    { id: 'stock', name: 'Add Stock', icon: Package, color: 'text-emerald-400' },
    { id: 'kasir', name: 'New Sale', icon: ShoppingCart, color: 'text-violet-400' },
    { id: 'absensi', name: 'Attendance', icon: ClipboardCheck, color: 'text-cyan-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab(action.id)}
          className="flex items-center justify-between p-4 bg-[#120f26]/80 border border-violet-500/10 rounded-2xl hover:border-violet-500/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white/5 ${action.color}`}>
              <action.icon size={20} />
            </div>
            <span className="text-sm font-semibold text-white">{action.name}</span>
          </div>
          <ArrowUpRight size={16} className="text-slate-500 group-hover:text-white" />
        </motion.button>
      ))}
    </div>
  );
}
