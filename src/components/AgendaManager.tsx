import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, Clock, MapPin, User, Tag, 
  ChevronLeft, ChevronRight, Plus, X, Trash2, Edit3,
  CalendarCheck, AlertCircle, Coffee, Briefcase, Zap, Moon, Check, Ban
} from 'lucide-react';
import { playClickSound, playSuccessSound } from '../lib/sounds';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import { translations } from '../lib/translations';
import { getPartitionedKey } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface AgendaItem {
  id: string;
  title: string;
  employeeName: string;
  date: string; // YYYY-MM-DD string
  timeIn: string;
  timeOut: string;
  status: 'Masuk' | 'Libur' | 'Cuti' | 'Meeting' | 'Lembur';
  priority: 'Low' | 'Medium' | 'High';
  notes: string;
  location: string;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export default function AgendaManager({ userRole }: { userRole: 'owner' | 'employee' }) {
  const { language } = useThemeLanguage();
  const t = (key: keyof typeof translations.id) => translations[language]?.[key] || key;

  // Sync state with tenant key (allows shared state between local simulation devices)
  const [agendas, setAgendas] = useState<AgendaItem[]>(() => {
    const key = getPartitionedKey('inmarket_agendas', false);
    const saved = localStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const key = getPartitionedKey('inmarket_leave_requests', false);
    const saved = localStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Form State Agenda
  const [title, setTitle] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [timeIn, setTimeIn] = useState('09:00');
  const [timeOut, setTimeOut] = useState('17:00');
  const [status, setStatus] = useState<AgendaItem['status']>('Masuk');
  const [priority, setPriority] = useState<AgendaItem['priority']>('Medium');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');

  // Form State Leave
  const [leaveDate, setLeaveDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');

  useEffect(() => {
    const key = getPartitionedKey('inmarket_agendas', false);
    localStorage.setItem(key, JSON.stringify(agendas));
  }, [agendas]);

  useEffect(() => {
    const key = getPartitionedKey('inmarket_leave_requests', false);
    localStorage.setItem(key, JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    playClickSound();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    playClickSound();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleSaveAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'owner') return;

    const newAgenda: AgendaItem = {
      id: `AG-${Date.now()}`,
      title,
      employeeName,
      date: selectedDate,
      timeIn,
      timeOut,
      status,
      priority,
      notes,
      location
    };

    setAgendas(prev => [...prev, newAgenda]);
    setShowAddForm(false);
    resetForm();
    playSuccessSound();
    
    // Trigger system notification simulation
    toast.success(language === 'id' ? 'Jadwal baru berhasil disinkronkan' : 'Schedule synchronized successfully', {
        style: { background: '#111', color: '#fff', border: '1px solid #10b981' }
    });
  };

  const deleteAgenda = (id: string) => {
    if (userRole !== 'owner') return;
    playClickSound();
    setAgendas(prev => prev.filter(a => a.id !== id));
    toast.success(language === 'id' ? 'Agenda dihapus' : 'Agenda deleted');
  };

  const resetForm = () => {
    setTitle('');
    setEmployeeName('');
    setTimeIn('09:00');
    setTimeOut('17:00');
    setStatus('Masuk');
    setPriority('Medium');
    setNotes('');
    setLocation('');
  };

  const getStatusColor = (s: AgendaItem['status']) => {
    switch (s) {
      case 'Masuk': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Libur': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Cuti': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Meeting': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Lembur': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  const getPriorityColor = (p: AgendaItem['priority']) => {
    switch (p) {
      case 'High': return 'text-rose-500';
      case 'Medium': return 'text-amber-500';
      case 'Low': return 'text-emerald-500';
      default: return 'text-slate-500';
    }
  };

  // Submit Leave Request
  const handleRequestLeave = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    let empName = 'Employee';
    const offlineUserStr = localStorage.getItem('offline_logged_in_user');
    if (offlineUserStr) {
      try {
        const u = JSON.parse(offlineUserStr);
        empName = u.name || u.displayName || u.email || empName;
      } catch {}
    }

    const newRequest: LeaveRequest = {
      id: `LV-${Date.now()}`,
      employeeName: empName,
      date: leaveDate,
      reason: leaveReason,
      status: 'Pending'
    };

    setLeaveRequests(prev => [newRequest, ...prev]);
    setShowLeaveForm(false);
    setLeaveReason('');
    playSuccessSound();

    toast.success(language === 'id' ? 'Permintaan cuti berhasil diajukan!' : 'Leave request submitted successfully!', {
      style: { background: '#111', color: '#fff', border: '1px solid #10b981' }
    });
  };

  // Approve / Reject Leave
  const handleApproveLeave = (reqId: string) => {
    playClickSound();
    
    // Find request
    const request = leaveRequests.find(r => r.id === reqId);
    if (!request) return;

    // Update status to Approved
    setLeaveRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Approved' } : r));

    // Automatically create or update a schedule agenda under status 'Cuti' for the employee
    const newAgenda: AgendaItem = {
      id: `AG-LV-${request.id}`,
      title: `${language === 'id' ? 'Cuti Disetujui' : 'Excused Leave'} - ${request.reason}`,
      employeeName: request.employeeName,
      date: request.date,
      timeIn: '00:00',
      timeOut: '23:59',
      status: 'Cuti',
      priority: 'Medium',
      notes: `${language === 'id' ? 'Cuti diajukan via portal karyawan' : 'Requested leave approved'}`,
      location: 'HQ'
    };

    // Remove duplicates or existing schedules for that date/employee if any, then insert
    setAgendas(prev => [...prev.filter(a => !(a.date === request.date && a.employeeName === request.employeeName)), newAgenda]);
    playSuccessSound();

    toast.success(language === 'id' ? 'Permintaan cuti disetujui, jadwal diperbarui!' : 'Leave approved, schedule updated!', {
      style: { background: '#111', color: '#fff', border: '1px solid #10b981' }
    });
  };

  const handleRejectLeave = (reqId: string) => {
    playClickSound();
    setLeaveRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'Rejected' } : r));
    playSuccessSound();
    toast.error(language === 'id' ? 'Permintaan cuti ditolak' : 'Leave request rejected', {
      style: { background: '#111', color: '#fff', border: '1px solid #f43f5e' }
    });
  };

  const filteredAgendas = agendas.filter(a => a.date === selectedDate);
  const monthName = currentDate.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });

  // Today and Week statistics
  const todayISO = new Date().toISOString().split('T')[0];
  const activeAgendasToday = agendas.filter(a => a.date === todayISO);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#090615] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <CalendarCheck size={24} />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">{language === 'id' ? 'AGENDA HARI INI' : 'TODAY\'S WORK'}</span>
            <span className="text-xl font-bold text-white font-mono">{activeAgendasToday.length} Active</span>
          </div>
        </div>

        <div className="bg-[#090615] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Zap size={24} />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">{language === 'id' ? 'SINKRONISASI REALTIME' : 'REALTIME SYNC'}</span>
            <span className="text-sm font-bold text-slate-300">Live Active Node</span>
          </div>
        </div>

        <div className="bg-[#090615] border border-white/10 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl border border-fuchsia-500/20">
            <Coffee size={24} />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">{language === 'id' ? 'CUTI & PERMINTAAN' : 'LEAVE REQUESTS'}</span>
            <span className="text-sm font-bold text-slate-300 font-mono">{leaveRequests.filter(r => r.status === 'Pending').length} Pending Requests</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-8 rounded-[2rem] bg-[#090615] border border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-white text-lg font-black uppercase tracking-widest flex items-center gap-2">
                  <CalendarIcon className="text-indigo-400" /> {t('calendarTitle')}
                </h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">SECURE SYNC CALENDAR SUITE</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-black text-indigo-400 uppercase tracking-wider">{monthName}</span>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"><ChevronLeft size={16} /></button>
                  <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <span key={i} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{day}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {[...Array(firstDayOfMonth(currentDate))].map((_, i) => (
                <div key={`empty-${i}`} className="h-16 lg:h-20" />
              ))}
              {[...Array(daysInMonth(currentDate))].map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const dailyAgendas = agendas.filter(a => a.date === dateStr);
                const hasAgenda = dailyAgendas.length > 0;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                return (
                  <motion.button
                    key={day}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { playClickSound(); setSelectedDate(dateStr); }}
                    className={`h-16 lg:h-20 rounded-xl p-2 relative flex flex-col transition-all border ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-400 shadow-lg scale-105 z-10 text-white' 
                        : 'bg-white/[0.02] border-white/5 hover:border-indigo-500/30 text-white'
                    } ${isToday && !isSelected ? 'ring-2 ring-emerald-400/50' : ''}`}
                  >
                    <span className={`text-[10px] font-bold self-end font-mono ${isSelected ? 'text-white' : 'text-slate-450 text-slate-400'}`}>
                      {day}
                    </span>
                    {hasAgenda && (
                      <div className="mt-auto flex gap-1 justify-center w-full">
                        {dailyAgendas.slice(0, 3).map((a, idx) => {
                          let dotColor = 'bg-emerald-450 bg-emerald-400';
                          if (a.status === 'Libur') dotColor = 'bg-rose-500';
                          if (a.status === 'Cuti') dotColor = 'bg-amber-500';
                          if (a.status === 'Meeting') dotColor = 'bg-blue-500';
                          if (a.status === 'Lembur') dotColor = 'bg-indigo-400';
                          return (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : dotColor}`} />
                          );
                        })}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* leave request stream view for owner / employee */}
          <div className="p-8 rounded-[2rem] bg-[#090615] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-white text-base font-black uppercase tracking-widest">{language === 'id' ? 'PORTAL AJUKAN CUTI & LIBUR' : 'LEAVE REQUEST INBOX'}</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">DECISION MATRIX CONTROL</p>
              </div>
              {userRole === 'employee' && (
                <button 
                  onClick={() => { playClickSound(); setShowLeaveForm(true); }}
                  className="px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-pink-650 text-white font-black text-[10.5px] uppercase tracking-wider rounded-xl cursor-pointer hover:scale-105 transition-all shadow-[0_4px_15px_rgba(217,70,239,0.3)]"
                >
                  Ajukan Libur / Cuti
                </button>
              )}
            </div>

            <div className="space-y-4 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {leaveRequests.length === 0 ? (
                <p className="text-slate-500 text-xs text-center italic py-6 uppercase tracking-wider">{language === 'id' ? 'Belum ada pengajuan cuti' : 'No submitted leave requests'}</p>
              ) : (
                leaveRequests.map(req => (
                  <div key={req.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{req.employeeName}</span>
                        <span className="text-[9px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-450 font-mono font-semibold">{req.date}</span>
                      </div>
                      <p className="text-slate-400 text-xs italic">Reason: "{req.reason}"</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2.5 py-1 rounded font-black uppercase tracking-wider ${
                        req.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                        req.status === 'Rejected' ? 'bg-rose-500/15 text-rose-450 border border-rose-500/20' :
                        'bg-amber-500/15 text-amber-400 border border-amber-500/20 animate-pulse'
                      }`}>
                        {req.status}
                      </span>
                      
                      {userRole === 'owner' && req.status === 'Pending' && (
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => handleApproveLeave(req.id)}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition border border-emerald-500/20 cursor-pointer"
                            title="Approve & Schedule"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => handleRejectLeave(req.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white rounded-lg transition border border-rose-500/20 cursor-pointer"
                            title="Reject"
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Schedule List Details Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-[2rem] bg-[#090615] border border-white/10 shadow-2xl flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-white text-sm font-black uppercase tracking-widest">{t('scheduleToday')}</h3>
                <p className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">{selectedDate}</p>
              </div>
              {userRole === 'owner' && (
                <button 
                  onClick={() => { playClickSound(); setShowAddForm(true); }}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg hover:rotate-90 transition-transform cursor-pointer"
                  title="Add Event Schedule"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[460px] pr-1 custom-scrollbar">
              {filteredAgendas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-40 text-center py-20">
                  <CalendarCheck size={48} className="mb-4 text-slate-500" />
                  <p className="text-xs font-black uppercase tracking-widest italic">{translations[language]?.noAgenda || 'Belum ada agenda hari ini.'}</p>
                </div>
              ) : (
                filteredAgendas.map(agenda => (
                  <motion.div 
                    key={agenda.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-indigo-500/20 transition-all relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${getStatusColor(agenda.status)}`}>
                        {agenda.status}
                      </span>
                      {userRole === 'owner' && (
                        <button 
                          onClick={() => deleteAgenda(agenda.id)}
                          className="p-1.5 bg-rose-500/10 text-rose-450 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-rose-500/20 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    
                    <h4 className="text-xs font-black mb-2 text-white uppercase tracking-wider">{agenda.title}</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-450 mb-3">
                      <div className="flex items-center gap-1.5"><User size={12} className="text-indigo-400" /> {agenda.employeeName}</div>
                      <div className="flex items-center gap-1.5"><Clock size={12} className="text-indigo-450 text-indigo-400" /> {agenda.timeIn} - {agenda.timeOut}</div>
                      <div className="flex items-center gap-1.5"><MapPin size={12} className="text-rose-400" /> {agenda.location || 'HQ'}</div>
                      <div className="flex items-center gap-1.5 text-amber-500"><Tag size={12} className={getPriorityColor(agenda.priority)} /> {agenda.priority} Priority</div>
                    </div>

                    {agenda.notes && (
                      <div className="p-2.5 bg-white/5 rounded-lg text-[9px] italic text-slate-400 leading-relaxed">
                        "{agenda.notes}"
                      </div>
                    )}

                    {/* Left corner accent glow indicator */}
                    <div className={`absolute top-0 right-0 w-1 h-full ${agenda.priority === 'High' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : agenda.priority === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Agenda Modal Form (Owner only) */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#090615] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-white text-lg font-black uppercase tracking-widest">{language === 'id' ? 'BUAT JADWAL OPERASIONAL' : 'CREATE SHIFT AGENDA'}</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">SINKRON SAS DI NODE: {selectedDate}</p>
                </div>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="text-slate-400 hover:text-white transition p-2 bg-white/5 border border-white/10 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveAgenda} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 mb-1.5 block tracking-widest uppercase">AGENDA DATA / SHIFT TITLE</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Barista Pagi / Kasir" className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors font-bold" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 mb-1.5 block tracking-widest uppercase">ASSIGN TO EMPLOYEE</label>
                  <input required value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="Nama Karyawan" className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 mb-1.5 block tracking-widest uppercase">LOCATION OFFICE</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="HQ / Store Floor" className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 mb-1.5 block tracking-widest uppercase">SHIFT TIME START</label>
                  <input type="time" value={timeIn} onChange={e => setTimeIn(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 mb-1.5 block tracking-widest uppercase">SHIFT TIME END</label>
                  <input type="time" value={timeOut} onChange={e => setTimeOut(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 mb-1.5 block tracking-widest uppercase">WORK STATUS SELECTION</label>
                  <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-indigo-400 outline-none focus:border-indigo-500 transition-colors cursor-pointer font-bold">
                    <option value="Masuk">Masuk Kerja</option>
                    <option value="Libur">Hari Libur</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Lembur">Lembur</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 mb-1.5 block tracking-widest uppercase">PRIORITY LEVEL</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-amber-500 outline-none focus:border-indigo-500 transition-colors cursor-pointer font-bold">
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[9px] font-black text-slate-400 mb-1.5 block tracking-widest uppercase">DETAILED NOTES / ASSIGNMENT DETAILS</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opsional detail deskripsi tugas..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <button type="submit" className="col-span-2 py-4 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-4 cursor-pointer">
                  🚀 SYNC SCHEDULING REALTIME
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Apply Leave Modal Form (Employee only) */}
      <AnimatePresence>
        {showLeaveForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaveForm(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#090615] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-white text-lg font-black uppercase tracking-widest">{language === 'id' ? 'AJUKAN CUTI / LIBUR' : 'APPLY FOR LEAVE SHIFT'}</h3>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mt-1">PORTAL KARYAWAN ONLINE</p>
                </div>
                <button onClick={() => setShowLeaveForm(false)} className="text-slate-400 hover:text-white transition p-2 bg-white/5 border border-white/10 rounded-full cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRequestLeave} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-1.5 tracking-wider uppercase">PILIH TANGGAL CUTI / LIBUR</label>
                  <input 
                    type="date"
                    required
                    value={leaveDate}
                    onChange={e => setLeaveDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-indigo-300 outline-none focus:border-fuchsia-500 transition-colors font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-1.5 tracking-wider uppercase">ALASAN KETIDAKHADIRAN / CUTI</label>
                  <textarea 
                    required
                    value={leaveReason}
                    onChange={e => setLeaveReason(e.target.value)}
                    rows={4}
                    placeholder="e.g. Cek kesehatan ke dokter / Keperluan keluarga"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-fuchsia-500 transition-colors leading-relaxed"
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:brightness-110 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-3 cursor-pointer">
                  🚀 TOKO OWNER APPROVAL REQUEST
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
