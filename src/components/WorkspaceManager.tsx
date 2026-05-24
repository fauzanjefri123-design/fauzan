import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  Calendar, 
  Mail, 
  MessageSquare, 
  FileText, 
  Users, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Send, 
  Check, 
  Loader2, 
  Lock, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Search,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { useThemeLanguage } from '../context/ThemeLanguageContext';
import toast from 'react-hot-toast';
import { setWorkspaceToken, setWorkspaceUserEmail } from '../lib/workspaceSync';

// Google Scopes used
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/chat.spaces',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/docs',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/tasks'
];

interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

interface ChatSpace {
  name: string; // "spaces/SPACE_ID"
  displayName: string;
  type: string;
}

interface KeepNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

interface TaskList {
  id: string;
  title: string;
}

interface Connection {
  resourceName: string;
  names?: Array<{ displayName: string }>;
  emailAddresses?: Array<{ value: string }>;
  phoneNumbers?: Array<{ value: string }>;
}

export default function WorkspaceManager() {
  const { language, storeTheme } = useThemeLanguage();

  // Access token state
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'calendar' | 'gmail' | 'chat' | 'docs' | 'contacts' | 'tasks' | 'keep'>('calendar');

  // Loading states for each API
  const [loaders, setLoaders] = useState({
    calendar: false,
    gmail: false,
    chat: false,
    docs: false,
    contacts: false,
    tasks: false,
  });

  // API Lists
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [createdDocs, setCreatedDocs] = useState<Array<{ id: string; title: string; url: string; createdAt: string }>>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  
  // Custom offline Keep notes (syncable with Docs & Tasks)
  const [keepNotes, setKeepNotes] = useState<KeepNote[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Forms
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', location: '', description: '' });
  const [newEmail, setNewEmail] = useState({ to: '', subject: '', body: '' });
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newChatMsg, setNewChatMsg] = useState({ spaceId: '', text: '' });
  const [newTask, setNewTask] = useState({ title: '', notes: '', due: '' });
  const [newKeepNote, setNewKeepNote] = useState({ title: '', content: '' });

  // Load persistence for created docs and offline keep notes inside useEffect
  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setGoogleUser(currentUser);
    });

    try {
      const savedDocs = localStorage.getItem('inmarket_google_docs_history');
      if (savedDocs) setCreatedDocs(JSON.parse(savedDocs));

      const savedKeep = localStorage.getItem('inmarket_mock_keep_notes');
      if (savedKeep) setKeepNotes(JSON.parse(savedKeep));
      else {
        const defaultNotes = [
          { id: '1', title: 'Rencana Belanja Dapur', content: 'Beli biji kopi Sumatra mandheling 5kg, Matcha powder 1kg, Cup ukuran 12oz & 16oz.', createdAt: new Date().toISOString() },
          { id: '2', title: 'Target AI Marketing 2026', content: 'Rilis promosi BOGO di hari Senin depan menggunakan asisten AI otomatis.', createdAt: new Date().toISOString() }
        ];
        setKeepNotes(defaultNotes);
        localStorage.setItem('inmarket_mock_keep_notes', JSON.stringify(defaultNotes));
      }
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Sync token whenever user logs in or retries login
  const handleGoogleAuth = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      // Add Workspace scopes dynamically
      SCOPES.forEach(scope => provider.addScope(scope));

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setAccessToken(token);
        setWorkspaceToken(token);
        setWorkspaceUserEmail(result.user.email);
        setGoogleUser(result.user);
        toast.success(language === 'id' ? 'Google Workspace Tersambung!' : 'Google Workspace Connected!');
        // Refresh immediate tab
        refreshData(activeWorkspaceTab, token);
      } else {
        throw new Error('Access token not supplied by Google Identity Provider.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error(language === 'id' ? 'Otorisasi dibatalkan (pop-up ditutup).' : 'Authorization cancelled (pop-up closed).');
      } else {
        toast.error(language === 'id' ? 'Koneksi Gagal. Silakan coba kembali.' : 'Connection failed. Please retry.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = () => {
    setAccessToken(null);
    setWorkspaceToken(null);
    setWorkspaceUserEmail(null);
    toast.success(language === 'id' ? 'Google Workspace Dinonaktifkan Hubungannya' : 'Google Workspace Disconnected');
  };

  // Generalized Refresh Trigger
  const refreshData = (tab: typeof activeWorkspaceTab, tokenOverride?: string) => {
    const activeToken = tokenOverride || accessToken;
    if (!activeToken) return;

    if (tab === 'calendar') fetchCalendarEvents(activeToken);
    if (tab === 'gmail') fetchGmailLatest(activeToken);
    if (tab === 'chat') fetchChatSpaces(activeToken);
    if (tab === 'contacts') fetchGoogleContacts(activeToken);
    if (tab === 'tasks') fetchTaskLists(activeToken);
  };

  useEffect(() => {
    if (accessToken) {
      refreshData(activeWorkspaceTab);
    }
  }, [activeWorkspaceTab, accessToken]);

  // ==================== GOOGLE CALENDAR ENDPOINTS ====================
  const fetchCalendarEvents = async (token: string) => {
    setLoaders(prev => ({ ...prev, calendar: true }));
    try {
      const timeMin = new Date().toISOString();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=15&orderBy=startTime&singleEvents=true&timeMin=${timeMin}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data.items || []);
    } catch (err) {
      console.warn('Google Calendar fetch error', err);
    } finally {
      setLoaders(prev => ({ ...prev, calendar: false }));
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!newEvent.title || !newEvent.date || !newEvent.time) {
      toast.error(language === 'id' ? 'Harap lengkapi judul, tanggal, dan jam!' : 'Please complete title, date, and time!');
      return;
    }

    try {
      const startDateTime = new Date(`${newEvent.date}T${newEvent.time}:00`).toISOString();
      // default end duration: 1 hour
      const endDateTime = new Date(new Date(`${newEvent.date}T${newEvent.time}:00`).getTime() + 60 * 60 * 1000).toISOString();

      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: newEvent.title,
            location: newEvent.location,
            description: newEvent.description,
            start: { dateTime: startDateTime, timeZone: 'Asia/Jakarta' },
            end: { dateTime: endDateTime, timeZone: 'Asia/Jakarta' }
          })
        }
      );

      if (res.ok) {
        toast.success(language === 'id' ? 'Jadwal Agenda Berhasil Dibuat ke Google Calendar!' : 'Event created in Google Calendar!');
        setNewEvent({ title: '', date: '', time: '', location: '', description: '' });
        fetchCalendarEvents(accessToken);
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error('Gagal membuat agenda Google.');
    }
  };

  const handleDeleteEvent = async (eventId: string, summary: string) => {
    const isConfirmed = window.confirm(
      language === 'id' 
        ? `Apakah Anda yakin ingin menghapus jadwal "${summary}" dari Google Calendar?`
        : `Are you sure you want to delete event "${summary}" from Google Calendar?`
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (res.ok) {
        toast.success(language === 'id' ? 'Jadwal Berhasil Dihapus!' : 'Event deleted successfully!');
        fetchCalendarEvents(accessToken!);
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error(language === 'id' ? 'Gagal menghapus jadwal.' : 'Failed to delete event.');
    }
  };

  // ==================== GMAIL ENDPOINTS ====================
  const fetchGmailLatest = async (token: string) => {
    setLoaders(prev => ({ ...prev, gmail: true }));
    try {
      const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const listData = await res.json();
      
      if (listData.messages && listData.messages.length > 0) {
        // Fetch details in parallel for high-fidelity feed
        const detailedMsgs = await Promise.all(
          listData.messages.map(async (msg: any) => {
            try {
              const detailRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (!detailRes.ok) return msg;
              const detail = await detailRes.json();
              
              const headersObj: Record<string, string> = {};
              detail.payload?.headers?.forEach((h: any) => {
                headersObj[h.name.toLowerCase()] = h.value;
              });

              return {
                id: msg.id,
                threadId: msg.threadId,
                snippet: detail.snippet,
                subject: headersObj['subject'] || '(No Subject)',
                from: headersObj['from'] || 'Unknown Sender',
                date: headersObj['date'] || ''
              };
            } catch {
              return msg;
            }
          })
        );
        setEmails(detailedMsgs);
      } else {
        setEmails([]);
      }
    } catch (err) {
      console.warn('Gmail fetch error', err);
    } finally {
      setLoaders(prev => ({ ...prev, gmail: false }));
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!newEmail.to || !newEmail.subject || !newEmail.body) {
      toast.error(language === 'id' ? 'Lengkapi tujuan, subjek, & isi email!' : 'Fill in to, subject, & body!');
      return;
    }

    const isConfirmed = window.confirm(
      language === 'id'
        ? `Kirim email ini ke "${newEmail.to}" menggunakan akun Gmail Anda?`
        : `Send this email to "${newEmail.to}" using your Gmail account?`
    );
    if (!isConfirmed) return;

    try {
      // Build RFC 2822 payload safely
      const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(newEmail.subject)))}?=`;
      const emailContent = [
        `To: ${newEmail.to}`,
        `Subject: ${utf8Subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        newEmail.body
      ].join('\r\n');

      // Safe Base58/Base64 web-safe conversion
      const rawEncoded = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: rawEncoded })
        }
      );

      if (res.ok) {
        toast.success(language === 'id' ? 'Email Berhasil Terkirim ke Penerima!' : 'Email sent successfully!');
        setNewEmail({ to: '', subject: '', body: '' });
        fetchGmailLatest(accessToken);
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error(language === 'id' ? 'Gagal mengirim email.' : 'Failed to send email.');
    }
  };

  // ==================== GOOGLE CHAT ENDPOINTS ====================
  const fetchChatSpaces = async (token: string) => {
    setLoaders(prev => ({ ...prev, chat: true }));
    try {
      const res = await fetch(
        'https://chat.googleapis.com/v1/spaces',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSpaces(data.spaces || []);
    } catch (err) {
      console.warn('Google Chat spaces empty or not enabled', err);
    } finally {
      setLoaders(prev => ({ ...prev, chat: false }));
    }
  };

  const handlePostChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!newChatMsg.spaceId || !newChatMsg.text) {
      toast.error(language === 'id' ? 'Pilih ruang obrolan & isi pesan!' : 'Select a Chat Space & enter text!');
      return;
    }

    try {
      const spaceObj = spaces.find(s => s.name === newChatMsg.spaceId);
      const spaceLabel = spaceObj ? spaceObj.displayName : newChatMsg.spaceId;
      const isConfirmed = window.confirm(
        language === 'id'
          ? `Kirim pesan ini ke ruang "${spaceLabel}"?`
          : `Send this message to space "${spaceLabel}"?`
      );
      if (!isConfirmed) return;

      const res = await fetch(
        `https://chat.googleapis.com/v1/${newChatMsg.spaceId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: newChatMsg.text })
        }
      );

      if (res.ok) {
        toast.success(language === 'id' ? 'Pesan Chat Terkirim!' : 'Message posted to Chat!');
        setNewChatMsg({ ...newChatMsg, text: '' });
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error(language === 'id' ? 'Gagal memposting pesan obrolan.' : 'Failed to post message.');
    }
  };

  // ==================== GOOGLE DOCS ENDPOINTS ====================
  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (!newDocTitle.trim()) {
      toast.error(language === 'id' ? 'Ketik judul dokumen Anda!' : 'Please enter document title!');
      return;
    }

    try {
      const res = await fetch(
        'https://docs.googleapis.com/v1/documents',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: newDocTitle
          })
        }
      );

      if (res.ok) {
        const docObj = await res.json();
        const dUrl = `https://docs.google.com/document/d/${docObj.documentId}/edit`;
        
        const newHistory = [
          {
            id: docObj.documentId,
            title: docObj.title || newDocTitle,
            url: dUrl,
            createdAt: new Date().toISOString()
          },
          ...createdDocs
        ];

        setCreatedDocs(newHistory);
        localStorage.setItem('inmarket_google_docs_history', JSON.stringify(newHistory));
        setNewDocTitle('');
        toast.success(language === 'id' ? 'Dokumen Google Docs Berhasil Dibuat!' : 'Google Document created successfully!');
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error(language === 'id' ? 'Gagal memproses pembuatan dokumen.' : 'Failed to create document.');
    }
  };

  const handleDeleteHistoryDoc = (id: string, title: string) => {
    const isConfirmed = window.confirm(
      language === 'id'
        ? `Lupakan riwayat berkas "${title}" dari aplikasi? (Dokumen asli tidak terhapus di Drive)`
        : `Lupakan history for "${title}" inside this app? (The document in Drive will not be deleted)`
    );
    if (!isConfirmed) return;

    const filtered = createdDocs.filter(d => d.id !== id);
    setCreatedDocs(filtered);
    localStorage.setItem('inmarket_google_docs_history', JSON.stringify(filtered));
    toast.success('Dihapus dari histori lokal.');
  };

  // ==================== GOOGLE CONTACTS ====================
  const fetchGoogleContacts = async (token: string) => {
    setLoaders(prev => ({ ...prev, contacts: true }));
    try {
      const res = await fetch(
        'https://people.googleapis.com/v1/people/me/connections?pageSize=80&personFields=names,emailAddresses,phoneNumbers',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConnections(data.connections || []);
    } catch (err) {
      console.warn('People API Connections Empty', err);
    } finally {
      setLoaders(prev => ({ ...prev, contacts: false }));
    }
  };

  // ==================== GOOGLE TASKS ====================
  const fetchTaskLists = async (token: string) => {
    setLoaders(prev => ({ ...prev, tasks: true }));
    try {
      const res = await fetch(
        'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      const lists: TaskList[] = data.items || [];
      setTaskLists(lists);
      
      if (lists.length > 0) {
        const initialListId = lists[0].id;
        setSelectedTaskListId(initialListId);
        fetchTasks(token, initialListId);
      }
    } catch (err) {
      console.warn('Error load tasks list', err);
    } finally {
      setLoaders(prev => ({ ...prev, tasks: false }));
    }
  };

  const fetchTasks = async (token: string, listId: string) => {
    if (!listId) return;
    setLoaders(prev => ({ ...prev, tasks: true }));
    try {
      const res = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?maxResults=40`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setTasks(data.items || []);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoaders(prev => ({ ...prev, tasks: false }));
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !selectedTaskListId) return;
    if (!newTask.title.trim()) {
      toast.error('Judul tugas harus dimasukkan!');
      return;
    }

    try {
      const res = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${selectedTaskListId}/tasks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: newTask.title,
            notes: newTask.notes,
            due: newTask.due ? new Date(newTask.due).toISOString() : undefined
          })
        }
      );

      if (res.ok) {
        toast.success(language === 'id' ? 'Tugas Berhasil Ditambahkan ke Google Tasks!' : 'Task added successfully to Google Tasks!');
        setNewTask({ title: '', notes: '', due: '' });
        fetchTasks(accessToken, selectedTaskListId);
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error('Gagal membuat tugas baru.');
    }
  };

  const handleToggleTaskStatus = async (task: GoogleTask) => {
    if (!accessToken || !selectedTaskListId) return;
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    
    try {
      const res = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${selectedTaskListId}/tasks/${task.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...task,
            status: newStatus
          })
        }
      );

      if (res.ok) {
        toast.success(newStatus === 'completed' ? 'Kerja bagus! Tugas selesai!' : 'Status diubah ke berjalan');
        fetchTasks(accessToken, selectedTaskListId);
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error('Gagal memperbarui status tugas.');
    }
  };

  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!accessToken || !selectedTaskListId) return;
    const isConfirmed = window.confirm(
      language === 'id' 
        ? `Apakah Anda yakin ingin menghapus tugas "${title}" dari Google Tasks?`
        : `Are you sure you want to delete task "${title}" from Google Tasks?`
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${selectedTaskListId}/tasks/${taskId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      if (res.ok) {
        toast.success(language === 'id' ? 'Tugas Dihapus!' : 'Task Deleted!');
        fetchTasks(accessToken, selectedTaskListId);
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error('Gagal menghapus tugas.');
    }
  };

  // ==================== SIMULATED KEEP NOTEBOOK WITH EXPORTS ====================
  const handleCreateKeepNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeepNote.title || !newKeepNote.content) {
      toast.error('Isi lengkap judul dan isi nota ke Keep!');
      return;
    }

    const newNote: KeepNote = {
      id: 'mock_keep_' + Date.now(),
      title: newKeepNote.title,
      content: newKeepNote.content,
      createdAt: new Date().toISOString()
    };

    const updated = [newNote, ...keepNotes];
    setKeepNotes(updated);
    localStorage.setItem('inmarket_mock_keep_notes', JSON.stringify(updated));
    setNewKeepNote({ title: '', content: '' });
    toast.success(language === 'id' ? 'Catatan Keep Berhasil Disimpan!' : 'Keep Note draft saved locally!');
  };

  const handleDeleteKeepNote = (id: string) => {
    const updated = keepNotes.filter(n => n.id !== id);
    setKeepNotes(updated);
    localStorage.setItem('inmarket_mock_keep_notes', JSON.stringify(updated));
    toast.success('Catatan dihapus.');
  };

  // Workspace Synergy Action: Export Note to Google Doc
  const handleExportNoteToDoc = async (note: KeepNote) => {
    if (!accessToken) {
      toast.error('Hubungkan Google Workspace terlebih dahulu!');
      return;
    }

    const isConfirmed = window.confirm(
      language === 'id'
        ? `Sinkronisasi: Buat dokumen baru di Google Docs dari catatan "${note.title}"?`
        : `Sync: Create a new Google Doc from keep note "${note.title}"?`
    );
    if (!isConfirmed) return;

    try {
      // 1. Create document
      const createRes = await fetch(
        'https://docs.googleapis.com/v1/documents',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: note.title })
        }
      );

      if (!createRes.ok) throw new Error();
      const docObj = await createRes.json();
      
      // 2. Insert body text
      await fetch(
        `https://docs.googleapis.com/v1/documents/${docObj.documentId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: 1 },
                  text: `${note.content}\n\n[Synced from InMarket Workspace Note | ${new Date().toLocaleDateString()}]`
                }
              }
            ]
          })
        }
      );

      const dUrl = `https://docs.google.com/document/d/${docObj.documentId}/edit`;
      const newHistory = [
        {
          id: docObj.documentId,
          title: docObj.title || note.title,
          url: dUrl,
          createdAt: new Date().toISOString()
        },
        ...createdDocs
      ];

      setCreatedDocs(newHistory);
      localStorage.setItem('inmarket_google_docs_history', JSON.stringify(newHistory));
      toast.success(language === 'id' ? 'Sinkronisasi Berhasil! Catatan Keep sekarang ada di Google Docs!' : 'Synced successfully! Notes exported to Google Docs!');
    } catch {
      toast.error('Gagal mengekspor catatan ke Google Docs.');
    }
  };

  // Workspace Synergy Action: Export Note to Google Task
  const handleExportNoteToTask = async (note: KeepNote) => {
    if (!accessToken) {
      toast.error('Hubungkan Google Workspace terlebih dahulu!');
      return;
    }
    if (taskLists.length === 0) {
      toast.error('Gagal menemukan daftar tugas aktif.');
      return;
    }

    const targetListId = selectedTaskListId || taskLists[0].id;

    try {
      const res = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${targetListId}/tasks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: note.title,
            notes: note.content
          })
        }
      );

      if (res.ok) {
        toast.success(language === 'id' ? 'Catatan Berhasil Ditambahkan sebagai Google Task!' : 'Exported successfully to Google Tasks!');
        if (targetListId === selectedTaskListId) {
          fetchTasks(accessToken, targetListId);
        }
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Gagal mengekspor ke Google Tasks.');
    }
  };

  // ==================== SEARCH / FILTER COMPUTATIONS ====================
  const filteredEvents = useMemo(() => {
    return events.filter(ev => 
      ev.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const filteredEmails = useMemo(() => {
    return emails.filter(em => 
      em.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      em.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      em.snippet?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [emails, searchQuery]);

  const filteredConnections = useMemo(() => {
    return connections.filter(conn => {
      const displayName = conn.names?.[0]?.displayName || '';
      const email = conn.emailAddresses?.[0]?.value || '';
      const phone = conn.phoneNumbers?.[0]?.value || '';
      return (
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [connections, searchQuery]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tasks, searchQuery]);


  return (
    <div className="rounded-3xl bg-slate-900/60 backdrop-blur-3xl border border-violet-500/20 p-6 space-y-6 relative overflow-hidden" id="workspace-manager-card">
      {/* Visual cyber borders */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-extrabold font-sans tracking-tight text-white flex items-center gap-2">
            <span className="p-1 px-2.5 bg-cyan-400/20 text-cyan-400 rounded-lg text-xs font-mono tracking-wider">WORKSPACE</span>
            Google Workspace Sync
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-bold">
            {language === 'id' 
              ? 'Sinkronisasi operasional toko dengan Gmail, Kalender, Chat, Berkas, Kontak, dan Pelacak Tugas Anda.' 
              : 'Synchronize store operations with Gmail, Calendar, Chat, Documents, Contacts, and Task tracker.'}
          </p>
        </div>

        {accessToken ? (
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3.5 rounded-full text-[10px] font-black tracking-widest text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              CONNECTED
            </div>
            <button 
              onClick={handleDisconnect}
              className="py-1.5 px-3 rounded-lg bg-red-600/15 hover:bg-red-600/30 border border-red-500/30 text-[10px] text-red-200 font-extrabold uppercase duration-200"
            >
              {language === 'id' ? 'Putuskan' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <button 
            onClick={handleGoogleAuth}
            disabled={isLoggingIn}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase duration-200 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.25)] cursor-pointer"
          >
            {isLoggingIn ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.24.6 4.45 1.64l2.42-2.42C17.31 1.6 14.93 1 12.24 1 6.16 1 1.24 5.92 1.24 12s4.92 11 11 11c6.35 0 10.57-4.47 10.57-10.76 0-.73-.08-1.28-.19-1.95H12.24z"/>
              </svg>
            )}
            <span>{language === 'id' ? 'Hubungkan Google Account' : 'Connect Google Workspace'}</span>
          </button>
        )}
      </div>

      {!accessToken ? (
        <div className="p-8 text-center bg-black/30 border border-slate-800 rounded-2xl space-y-4">
          <div className="w-12 h-12 bg-cyan-400/15 text-cyan-400 rounded-full flex items-center justify-center mx-auto border border-cyan-400/35">
            <Lock size={20} />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-widest">
              {language === 'id' ? 'OTORISASI OPERASIONAL' : 'AUTHORIZATION REQUIRED'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-bold">
              {language === 'id'
                ? 'Guna meningkatkan performa & otomatisasi asisten AI, Anda dapat menyinkronkan data toko dengan kalender event, penulisan dokumen, pemantau prospek di kontak, serta mengirim tanggapan email Gmail dan tim Chat Anda secara langsung.'
                : 'To enable automated features and synergize with Google APIs, securely link your store metadata with your email responders, calendar agendas, tasks, and sales documents.'}
            </p>
          </div>
          <div className="pt-2">
            <button 
              onClick={handleGoogleAuth}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs uppercase duration-200 shadow-lg inline-flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.24.6 4.45 1.64l2.42-2.42C17.31 1.6 14.93 1 12.24 1 6.16 1 1.24 5.92 1.24 12s4.92 11 11 11c6.35 0 10.57-4.47 10.57-10.76 0-.73-.08-1.28-.19-1.95H12.24z"/>
              </svg>
              <span>{language === 'id' ? 'Aktifkan Integrasi Sekarang' : 'Activate Workspace Sync'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workspace Tabs */}
          <div className="flex overflow-x-auto gap-2 border-b border-slate-800 pb-1 scrollbar-none">
            {[
              { id: 'calendar', name: language === 'id' ? 'Kalender' : 'Calendar', icon: Calendar },
              { id: 'gmail', name: 'Gmail', icon: Mail },
              { id: 'chat', name: 'Google Chat', icon: MessageSquare },
              { id: 'docs', name: 'Docs Hub', icon: FileText },
              { id: 'contacts', name: language === 'id' ? 'Kontak' : 'Contacts', icon: Users },
              { id: 'tasks', name: 'Tasks', icon: CheckSquare },
              { id: 'keep', name: 'Keep Drafts', icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveWorkspaceTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                  activeWorkspaceTab === tab.id 
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.35)]' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.name}</span>
              </button>
            ))}
          </div>

          {/* Search bar for workspace */}
          {activeWorkspaceTab !== 'docs' && activeWorkspaceTab !== 'keep' && (
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder={language === 'id' ? 'Saring data workspace...' : 'Filter workspace items...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 duration-200"
              />
            </div>
          )}

          {/* Tab Content Panels */}
          
          {/* 1. GOOGLE CALENDAR PANEL */}
          {activeWorkspaceTab === 'calendar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Event Maker form */}
              <div className="lg:col-span-5 bg-black/20 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Plus size={14} /> {language === 'id' ? 'Buat Agenda Baru' : 'Add New Event'}
                </h4>
                <form onSubmit={handleCreateEvent} className="space-y-3 font-bold">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Judul Rapat/Agenda</label>
                    <input 
                      type="text"
                      className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Meeting Suplier Baru Arabika"
                      value={newEvent.title}
                      onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Tanggal</label>
                      <input 
                        type="date"
                        className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                        value={newEvent.date}
                        onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Jam</label>
                      <input 
                        type="time"
                        className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                        value={newEvent.time}
                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Lokasi / Tautan Video</label>
                    <input 
                      type="text"
                      className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Cabang Coffee Lab / Google Meet link"
                      value={newEvent.location}
                      onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Deskripsi</label>
                    <textarea 
                      className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 h-16 resize-none"
                      placeholder="Membahas margin supply dan estimasi delivery bulanan..."
                      value={newEvent.description}
                      onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider duration-200 hover:bg-cyan-300"
                  >
                    SYNC TO CALENDAR
                  </button>
                </form>
              </div>

              {/* Events display list */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-3">
                <div className="flex justify-between items-center pb-2">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest">{language === 'id' ? 'Jadwal Google Calendar Terdekat' : 'Upcoming Calendar Events'}</h4>
                  <button onClick={() => refreshData('calendar')} className="p-1 px-2.5 rounded border border-slate-800 bg-slate-800/20 text-[10px] text-slate-400 flex items-center gap-1 hover:text-cyan-400 duration-200">
                    <RefreshCw size={10} className={loaders.calendar ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>

                {loaders.calendar ? (
                  <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                    <span>Loading events feed...</span>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-8 text-center bg-black/20 border border-slate-800/50 rounded-2xl text-slate-500 text-xs font-bold leading-relaxed">
                    Tidak ada agenda rapat mendominasi saat ini. Buat rencana baru di form sebelah kiri!
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
                    {filteredEvents.map(event => {
                      const startStr = event.start.dateTime || event.start.date || '';
                      const dateObj = new Date(startStr);
                      const formattedDate = dateObj.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <div key={event.id} className="p-3 bg-black/20 hover:bg-black/40 border border-slate-800 rounded-xl flex justify-between items-start gap-3 duration-200">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono tracking-wider text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded">
                              {formattedDate}
                            </span>
                            <h5 className="text-xs font-extrabold text-white mt-1">{event.summary || '(Untitled Event)'}</h5>
                            {event.location && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1">📍 {event.location}</p>
                            )}
                            {event.description && (
                              <p className="text-[10px] text-slate-500 italic max-w-md line-clamp-1">{event.description}</p>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => handleDeleteEvent(event.id, event.summary)}
                            className="p-1 bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg duration-200"
                            title="Delete Event"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. GMAIL RESPENDERS PANEL */}
          {activeWorkspaceTab === 'gmail' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Mail Sender Form */}
              <div className="lg:col-span-5 bg-black/20 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Send size={14} /> {language === 'id' ? 'Kirim Pesan Email' : 'Send Gmail Message'}
                </h4>
                <form onSubmit={handleSendEmail} className="space-y-3 font-bold">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Alamat Email Penerima</label>
                    <input 
                      type="email"
                      className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      placeholder="penerima@mitrabisnis.com"
                      value={newEmail.to}
                      onChange={e => setNewEmail({ ...newEmail, to: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Subjek / Judul Email</label>
                    <input 
                      type="text"
                      className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Invoice Digital InMarket #1422"
                      value={newEmail.subject}
                      onChange={e => setNewEmail({ ...newEmail, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Isi Pesan Surat</label>
                    <textarea 
                      className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 h-32 resize-none"
                      placeholder="Terima kasih atas kerja samanya. Berikut rincian laporan produk..."
                      value={newEmail.body}
                      onChange={e => setNewEmail({ ...newEmail, body: e.target.value })}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider duration-200 hover:bg-cyan-300"
                  >
                    SEND EMAIL VIA GMAIL
                  </button>
                </form>
              </div>

              {/* Mail Feed list */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-3">
                <div className="flex justify-between items-center pb-2">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest">{language === 'id' ? 'Kotak Masuk Gmail Terakhir' : 'Recent Gmail Messages'}</h4>
                  <button onClick={() => refreshData('gmail')} className="p-1 px-2.5 rounded border border-slate-800 bg-slate-800/20 text-[10px] text-slate-400 flex items-center gap-1 hover:text-cyan-400 duration-200">
                    <RefreshCw size={10} className={loaders.gmail ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>

                {loaders.gmail ? (
                  <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                    <span>Loading Gmail inbox...</span>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="p-8 text-center bg-black/20 border border-slate-800/50 rounded-2xl text-slate-500 text-xs font-bold leading-relaxed">
                    Tidak ditemukan email baru di akun Gmail Anda saat ini.
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
                    {filteredEmails.map(mail => (
                      <div key={mail.id} className="p-3 bg-black/20 hover:bg-black/40 border border-slate-800 rounded-xl duration-200 flex flex-col gap-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] font-mono font-bold text-slate-400 truncate max-w-[200px]">
                            {mail.from}
                          </span>
                          <span className="text-[8px] text-slate-500 whitespace-nowrap">
                            {mail.date ? new Date(mail.date).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <h5 className="text-xs font-extrabold text-cyan-300 line-clamp-1">{mail.subject}</h5>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed bg-black/30 p-2 rounded-lg mt-1 font-bold">
                          {mail.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. GOOGLE CHAT PANEL */}
          {activeWorkspaceTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Chat Spaces lists */}
              <div className="lg:col-span-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Ruang Obrolan / Spaces</h4>
                  <button onClick={() => refreshData('chat')} className="p-1 px-2 border border-slate-800 bg-slate-800/20 text-[9px] text-slate-400 hover:text-cyan-400 duration-200">
                    Refresh
                  </button>
                </div>

                {loaders.chat ? (
                  <div className="flex justify-center p-8">
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                  </div>
                ) : spaces.length === 0 ? (
                  <div className="p-5 text-center bg-black/20 border border-slate-800 rounded-xl text-slate-500 text-[10px] font-bold">
                    Tidak ditemukan ruang Chat aktif. Anda perlu mengaktifkan Google Chat di Google Workspace Admin.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {spaces.map(sp => (
                      <button
                        key={sp.name}
                        onClick={() => setNewChatMsg({ ...newChatMsg, spaceId: sp.name })}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-black transition-all flex items-center gap-2 ${
                          newChatMsg.spaceId === sp.name 
                            ? 'bg-cyan-500/10 border-cyan-450 text-white' 
                            : 'bg-black/10 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <MessageSquare size={13} className="text-cyan-400" />
                        <span className="truncate">{sp.displayName || sp.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Composer Panel */}
              <div className="lg:col-span-8 bg-black/20 p-5 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Send size={14} /> Kirim Pesan Tim Google Chat
                </h4>
                {newChatMsg.spaceId ? (
                  <form onSubmit={handlePostChatMessage} className="space-y-3 font-bold">
                    <div className="p-3 bg-cyan-950/10 border border-cyan-800/30 rounded-xl text-[10px] text-cyan-300 flex items-center justify-between">
                      <span>Aktif Ruang: <strong>{spaces.find(s => s.name === newChatMsg.spaceId)?.displayName || newChatMsg.spaceId}</strong></span>
                      <button onClick={() => setNewChatMsg({ ...newChatMsg, spaceId: '' })} className="underline text-red-400 hover:text-red-300">Batalkan ruang</button>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Konten Pesan Chat</label>
                      <textarea 
                        className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 h-24 resize-none"
                        placeholder="Halo tim, persediaan arabika sisa sedikit. Saya minta tolong di-restock hari ini ya!"
                        value={newChatMsg.text}
                        onChange={e => setNewChatMsg({ ...newChatMsg, text: e.target.value })}
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider duration-200 hover:bg-cyan-300"
                    >
                      KIRIM KE GOOGLE CHAT
                    </button>
                  </form>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs font-bold leading-relaxed border border-dashed border-slate-800 rounded-xl">
                    Silakan seleksi salah satu ruang Google Chat di kolom kiri untuk mulai mengetik pengumuman / briefing otomatis.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. DOCS HUB */}
          {activeWorkspaceTab === 'docs' && (
            <div className="space-y-6">
              {/* Document Creator Form */}
              <div className="bg-black/20 p-5 rounded-2xl border border-slate-800 max-w-lg space-y-4">
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Plus size={14} /> Buat Dokumen Google Docs Kosong
                </h4>
                <form onSubmit={handleCreateDoc} className="flex gap-2 font-bold">
                  <input 
                    type="text"
                    className="flex-1 p-2.5 rounded-xl bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Laporan Bulanan Penjualan Mei 2026"
                    value={newDocTitle}
                    onChange={e => setNewDocTitle(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="px-5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider duration-200 hover:bg-cyan-300 cursor-pointer"
                  >
                    CREATE DOC
                  </button>
                </form>
              </div>

              {/* Created files listing */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest">Histori Dokumen Google Docs Buatan Anda</h4>
                
                {createdDocs.length === 0 ? (
                  <div className="p-8 text-center bg-black/20 border border-slate-800/50 rounded-2xl text-slate-500 text-xs font-bold">
                    Belum ada dokumen yang dideklarasikan oleh InMarket. Buat berkas baru di form atas!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {createdDocs.map(doc => (
                      <div key={doc.id} className="p-4 bg-black/20 hover:bg-black/40 border border-slate-800 rounded-2xl ease-out transition-all flex justify-between items-center gap-3">
                        <div className="space-y-0.5 max-w-[70%]">
                          <h5 className="text-xs font-black text-white truncate">{doc.title}</h5>
                          <span className="text-[8px] font-mono text-slate-500 block">ID: {doc.id.slice(0, 15)}...</span>
                          <span className="text-[8px] text-slate-400">Created At: {new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 px-2.5 bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 text-[10px] rounded-lg font-black flex items-center gap-1 hover:bg-cyan-400 duration-200 hover:text-slate-950"
                          >
                            OPEN <ExternalLink size={10} />
                          </a>
                          <button 
                            onClick={() => handleDeleteHistoryDoc(doc.id, doc.title)}
                            className="p-1.5 bg-red-600/15 border border-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg duration-200"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. CONTACTS PANEL */}
          {activeWorkspaceTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2">
                <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest">{language === 'id' ? 'Pelanggan & Mitra dari Google Contacts' : 'Mitra Prospected / Google Contacts'}</h4>
                <button onClick={() => refreshData('contacts')} className="p-1 px-2.5 rounded border border-slate-800 bg-slate-800/20 text-[10px] text-slate-400 flex items-center gap-1 hover:text-cyan-400 duration-200">
                  <RefreshCw size={10} className={loaders.contacts ? "animate-spin" : ""} /> Refresh
                </button>
              </div>

              {loaders.contacts ? (
                <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
                  <Loader2 size={16} className="animate-spin text-cyan-400" />
                  <span>Loading connections list...</span>
                </div>
              ) : filteredConnections.length === 0 ? (
                <div className="p-8 text-center bg-black/20 border border-slate-800/50 rounded-2xl text-slate-500 text-xs font-bold leading-relaxed">
                  Belum ada kontak Google yang tersambung atau ditemukan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
                  {filteredConnections.map((conn, idx) => {
                    const name = conn.names?.[0]?.displayName || 'Unnamed Connection';
                    const email = conn.emailAddresses?.[0]?.value || '';
                    const phone = conn.phoneNumbers?.[0]?.value || '';
                    
                    return (
                      <div key={conn.resourceName || idx} className="p-3 bg-black/20 hover:bg-black/40 border border-slate-800 rounded-xl flex items-center gap-3 duration-200">
                        <div className="w-9 h-9 bg-fuchsia-500/10 text-fuchsia-400 rounded-full flex items-center justify-center font-bold text-xs border border-fuchsia-500/20">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-0.5 truncate flex-1">
                          <h5 className="text-xs font-extrabold text-white truncate">{name}</h5>
                          {email && <p className="text-[10px] text-slate-400 truncate">✉️ {email}</p>}
                          {phone && <p className="text-[10px] text-slate-400 truncate">📞 {phone}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 6. GOOGLE TASKS PANEL */}
          {activeWorkspaceTab === 'tasks' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Task list Selector and Creator */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-black/20 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckSquare size={14} /> Pilih Daftar Tugas
                  </h4>
                  <div className="space-y-3 font-bold">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Google TaskLists</label>
                      <select 
                        className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 custom-scrollbar"
                        value={selectedTaskListId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTaskListId(val);
                          fetchTasks(accessToken!, val);
                        }}
                      >
                        {taskLists.map(list => (
                          <option key={list.id} value={list.id} className="bg-slate-900 text-white font-bold">{list.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Make Task form */}
                <div className="bg-black/20 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Plus size={14} /> Buat Tugas Baru
                  </h4>
                  <form onSubmit={handleCreateTask} className="space-y-3 font-bold">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Nama Tugas</label>
                      <input 
                        type="text"
                        className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                        placeholder="Hubungi Supplier Gayo Kopi"
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Detail Catatan Tugas</label>
                      <textarea 
                        className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 h-16 resize-none"
                        placeholder="Mencocokkan harga baru kemasan per kilo..."
                        value={newTask.notes}
                        onChange={e => setNewTask({ ...newTask, notes: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase">Tenggat Waktu (Due Date)</label>
                      <input 
                        type="date"
                        className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                        value={newTask.due}
                        onChange={e => setNewTask({ ...newTask, due: e.target.value })}
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider duration-200 hover:bg-cyan-300"
                    >
                      ADD TO GOOGLE TASKS
                    </button>
                  </form>
                </div>
              </div>

              {/* Tasks display list */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-3">
                <div className="flex justify-between items-center pb-2">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest">Daftar Kerja Google Tasks</h4>
                  <button onClick={() => refreshData('tasks')} className="p-1 px-2.5 rounded border border-slate-800 bg-slate-800/20 text-[10px] text-slate-400 flex items-center gap-1 hover:text-cyan-400 duration-200">
                    <RefreshCw size={10} className={loaders.tasks ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>

                {loaders.tasks ? (
                  <div className="flex items-center justify-center p-12 text-slate-400 text-xs gap-2">
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                    <span>Loading task elements...</span>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="p-8 text-center bg-black/20 border border-slate-800/50 rounded-2xl text-slate-500 text-xs font-bold leading-relaxed">
                    Tidak ada tugas tersisa pada daftar seleksi ini. Coba buat yang baru!
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
                    {filteredTasks.map(task => (
                      <div key={task.id} className="p-3 bg-black/20 hover:bg-black/40 border border-slate-800 rounded-xl flex justify-between items-center gap-3 duration-200">
                        <div className="flex items-center gap-3 truncate">
                          <button 
                            onClick={() => handleToggleTaskStatus(task)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                              task.status === 'completed' 
                                ? 'bg-cyan-400 border-cyan-400 text-slate-950' 
                                : 'border-slate-700 hover:border-cyan-450 text-transparent'
                            }`}
                          >
                            <Check size={12} strokeWidth={4} />
                          </button>
                          <div className="truncate">
                            <h5 className={`text-xs font-extrabold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>{task.title || '(Untitled Task)'}</h5>
                            {task.notes && (
                              <p className="text-[10px] text-slate-400 truncate max-w-sm">{task.notes}</p>
                            )}
                            {task.due && (
                              <p className="text-[8px] font-mono font-bold text-fuchsia-400 mt-0.5">⚠️ Due: {new Date(task.due).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="p-1 bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg duration-200"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. KEEP SIMULATOR W/ EXPORT SYNERGY */}
          {activeWorkspaceTab === 'keep' && (
            <div className="space-y-6">
              {/* Info panel explaining restrictions */}
              <div className="p-4 bg-cyan-950/10 border border-cyan-800/30 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-cyan-400 shrink-0 mt-0.5" size={16} />
                <div className="space-y-1">
                  <h5 className="text-[11px] font-black uppercase text-cyan-300 tracking-wider">Note: Google Keep API domain restriction</h5>
                  <p className="text-[10px] text-slate-400 leading-normal font-semibold">
                    Google Keep API akses dibatasi secara ketat oleh Google kepada enterprise GSuite/Workspace admins dengan delegasi domain formal. Namun, InMarket menyajikan **Workspace Note Manager** dengan integrasi sinkronisasi penuh ke **Google Docs** dan **Google Tasks**!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Note Editor */}
                <form onSubmit={handleCreateKeepNote} className="lg:col-span-4 bg-black/20 p-5 rounded-2xl border border-slate-800 space-y-4 font-bold">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Plus size={14} /> Nota Cepat Baru
                  </h4>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Judul Nota</label>
                    <input 
                      type="text"
                      className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Resep Coffee Cream Foam"
                      value={newKeepNote.title}
                      onChange={e => setNewKeepNote({ ...newKeepNote, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase">Konten Nota</label>
                    <textarea 
                      className="w-full mt-1 p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400 h-28 resize-none"
                      placeholder="Susu Segar 200ml, Whipping cream bubuk 2 sendok, Brown sugar syrup 15ml, Shake selama 60 detik..."
                      value={newKeepNote.content}
                      onChange={e => setNewKeepNote({ ...newKeepNote, content: e.target.value })}
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black uppercase tracking-wider duration-200 hover:bg-cyan-300 cursor-pointer"
                  >
                    SAVE NOTE DRAFT
                  </button>
                </form>

                {/* Notes list */}
                <div className="lg:col-span-12 xl:col-span-8 space-y-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Nota Toko & Sinergi Sinkronisasi</h4>
                  
                  {keepNotes.length === 0 ? (
                    <div className="p-8 text-center bg-black/20 border border-slate-800 rounded-2xl text-slate-500 text-xs font-bold">
                      Belum ada nota draft tersimpan. Buat nota baru di kolom kiri!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {keepNotes.map(note => (
                        <div key={note.id} className="p-4 bg-black/20 hover:bg-black/30 border border-slate-800 rounded-2xl flex flex-col justify-between gap-4 h-full relative">
                          <button 
                            onClick={() => handleDeleteKeepNote(note.id)}
                            className="absolute top-3 right-3 p-1 text-slate-500 hover:text-red-400 duration-200"
                          >
                            <Trash2 size={12} />
                          </button>

                          <div className="space-y-1.5 pr-4">
                            <h5 className="text-xs font-extrabold text-cyan-350">{note.title}</h5>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          </div>

                          <div className="border-t border-slate-800/60 pt-3 flex items-center gap-2 justify-end">
                            <button 
                              onClick={() => handleExportNoteToDoc(note)}
                              className="px-2 py-1 bg-violet-600/15 border border-violet-500/25 text-[9px] font-black text-violet-300 rounded hover:bg-violet-600/30 flex items-center gap-1 duration-150"
                              title="Export to Google Docs"
                            >
                              +DOCS
                            </button>
                            <button 
                              onClick={() => handleExportNoteToTask(note)}
                              className="px-2 py-1 bg-cyan-400/10 border border-cyan-400/20 text-[9px] font-black text-cyan-300 rounded hover:bg-cyan-400/20 flex items-center gap-1 duration-150"
                              title="Export to Google Tasks"
                            >
                              +TASKS
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
