import { doc, setDoc, collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db, auth } from './firebase';
import { safeJsonParse } from './utils';

export interface SystemActivity {
  id: string;
  userId: string;       // User's email or UID
  ownerId: string;   // Owner email or unique business anchor
  businessId: string;   // Owner email or unique business anchor
  role: string;         // 'Owner' | 'Employee'
  user: string;         // displayName or fullName
  action: string;       // activity explanation
  time: string;         // e.g., "11:24"
  createdAt: string;    // ISO timestamp
}

// Memory list of active local callbacks for realtime in-app event routing (subscribers)
type ActivityCallback = (activities: SystemActivity[]) => void;
const subscribers = new Map<string, Set<ActivityCallback>>();

/**
 * Retrieves the current logged-in user profile, email, role, and display name
 */
export function getCurrentUserContext() {
  const offlineUserStr = localStorage.getItem('offline_logged_in_user');
  let email = '';
  let uid = '';
  let username = 'User';
  let role = 'Owner';
  let businessId = '';

  if (auth.currentUser) {
    email = auth.currentUser.email || '';
    uid = auth.currentUser.uid;
    role = email.includes('karyawan') || email.includes('employee') ? 'Employee' : 'Owner';
    username = auth.currentUser.displayName || (email ? email.split('@')[0] : 'User');
    businessId = uid;
  }

  if (offlineUserStr) {
    const u = safeJsonParse(offlineUserStr, null);
    if (u) {
      email = u.email || email;
      uid = u.uid || uid;
      role = u.role === 'Employee' || u.role === 'Karyawan' ? 'Employee' : role;
      username = u.displayName || u.username || (email ? email.split('@')[0] : username);
      businessId = u.businessId || businessId;
    }
  }

  // If role is employee, customize username to employee profile full name if available
  if (role === 'Employee') {
    const empProfStr = localStorage.getItem('inmarket_employee_profile');
    const emp = safeJsonParse(empProfStr, null);
    if (emp) {
      username = emp.fullName || username;
      if (emp.ownerId) {
        businessId = emp.ownerId;
      } else if (emp.ownerEmail) {
        businessId = emp.ownerEmail.replace(/[^a-zA-Z0-9]/g, '_');
      }
    }
  } else {
    // If owner, check if business profile has a custom ownerName
    if (uid) {
      const bizKey = `inmarket_business_tenant_${uid}_`;
      const bizDataStr = localStorage.getItem(bizKey);
      const bizData = safeJsonParse(bizDataStr, null);
      if (bizData && bizData.ownerName) {
        username = bizData.ownerName;
      }
    }
  }

  // Capitalize name beautifier
  if (username) {
    username = username
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return { userId: uid || email, uid: uid || email, businessId: businessId || uid || email, role, username };
}

/**
 * Returns partition key for user-specific activity storage
 */
export function getActivitiesStorageKey(userId: string): string {
  const sanitizedId = userId.replace(/[^a-zA-Z0-9]/g, '_');
  return `activities_${auth.currentUser ? auth.currentUser.uid : sanitizedId}`;
}

/**
 * Seeds initial activities for a newly registered or authenticated profile
 */
export function seedInitialUserActivities(userId: string, username: string) {
  const customName = username
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const key = getActivitiesStorageKey(userId);
  const existing = localStorage.getItem(key);
  
  if (!existing || JSON.parse(existing).length === 0) {
    const initialLogs: SystemActivity[] = [
      {
        id: `act_init_1_${Date.now()}`,
        userId: userId,
        ownerId: auth.currentUser ? auth.currentUser.uid : userId.replace(/[^a-zA-Z0-9]/g, '_'),
        businessId: userId.replace(/[^a-zA-Z0-9]/g, '_'),
        role: 'Owner',
        user: customName || 'Owner',
        action: 'Selamat datang di InMarket.id! Sistem business operating system Anda siap digunakan.',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date(Date.now() - 1000).toISOString()
      },
      {
        id: `act_init_2_${Date.now()}`,
        userId: userId,
        ownerId: auth.currentUser ? auth.currentUser.uid : userId.replace(/[^a-zA-Z0-9]/g, '_'),
        businessId: userId.replace(/[^a-zA-Z0-9]/g, '_'),
        role: 'Owner',
        user: customName || 'Owner',
        action: 'Account berhasil dibuat secara realtime dan aman.',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date(Date.now() - 2000).toISOString()
      }
    ];

    localStorage.setItem(key, JSON.stringify(initialLogs));
    
    // Broadcast
    triggerLocalSubscribers(userId, initialLogs);

    // Sync to Firestore if user is authenticated
    if (auth.currentUser) {
      initialLogs.forEach(log => {
        setDoc(doc(db, 'activities', log.id), log)
          .catch(err => console.warn("Initial activity Firestore seed skipped:", err));
      });
    }
  }
}

/**
 * Logs a new real-time system activity tied exclusively to the active account session
 */
export async function logActivity(actionText: string, customUserContext?: any) {
  const context = customUserContext || getCurrentUserContext();
  if (!context || !context.userId) return;

  const timestamp = new Date();
  const timeFormatted = timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const act: SystemActivity = {
    id: `act_${timestamp.getTime()}_${Math.floor(Math.random() * 1000)}`,
    userId: context.userId,
    ownerId: auth.currentUser ? auth.currentUser.uid : context.businessId,
    businessId: context.businessId,
    role: context.role,
    user: context.username,
    action: actionText,
    time: timeFormatted,
    createdAt: timestamp.toISOString()
  };

  // 1. Persist to User Partitioned LocalStorage
  const key = getActivitiesStorageKey(context.userId);
  let localList: SystemActivity[] = [];
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      localList = JSON.parse(stored);
    } catch (e) {
      localList = [];
    }
  }

  // Prepend new activity log and enforce 30 maximum items limit
  localList = [act, ...localList].slice(0, 30);
  localStorage.setItem(key, JSON.stringify(localList));

  // 2. Alert all active subscribers of this userId
  triggerLocalSubscribers(context.userId, localList);

  // 3. Debounced Persist to Firestore if user is logged into Firebase
  if (auth.currentUser && auth.currentUser.email === context.userId) {
    if ((window as any)._activitySyncTimeout) {
      clearTimeout((window as any)._activitySyncTimeout);
    }
    (window as any)._activitySyncTimeout = setTimeout(() => {
      try {
        setDoc(doc(db, 'activities', act.id), act);
      } catch (fireErr) {
        console.warn("Firestore activity sync delayed/offline:", fireErr);
      }
    }, 2000); // Debounce network write by 2 seconds
  }
}

/**
 * Triggers any active local subscribers for real-time updates without reload
 */
function triggerLocalSubscribers(userId: string, data: SystemActivity[]) {
  const userSubs = subscribers.get(userId);
  if (userSubs) {
    userSubs.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error("Subscriber execution failed:", err);
      }
    });
  }
}

/**
 * Subscribes to an account's activities with instant local storage delivery
 * and real-time Firestore sync listener cascade.
 */
export function subscribeToActivities(userId: string, callback: ActivityCallback): () => void {
  // Add callback to local hot-reload memory subscribers first
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  subscribers.get(userId)!.add(callback);

  // 1. Immediately report current cached values so there's ZERO rendering wait
  const key = getActivitiesStorageKey(userId);
  let currentLocal: SystemActivity[] = [];
  const storedInput = localStorage.getItem(key);
  if (storedInput) {
    try {
      currentLocal = JSON.parse(storedInput);
    } catch (e) {}
  }
  callback(currentLocal);

  // Local window storage change backup listener (handles syncing across multi-browser-tabs smoothly)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === key && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch (err) {}
    }
  };
  window.addEventListener('storage', handleStorageChange);

  // 2. Cascade in real-time Firestore listener if connected/authenticated with Google or Firebase
  let unsubscribeFirestore = () => {};
  if (auth.currentUser && auth.currentUser.email === userId) {
    try {
      const q = query(
        collection(db, 'activities'),
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(30)
      );

      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const fetchedList: SystemActivity[] = [];
        snapshot.forEach((snapDoc) => {
          fetchedList.push(snapDoc.data() as SystemActivity);
        });

        if (fetchedList.length > 0) {
          // Merge and update local activities cache
          localStorage.setItem(key, JSON.stringify(fetchedList));
          callback(fetchedList);
        }
      }, (err) => {
        console.warn("Firestore real-time listener inactive/fallback:", err.message);
      });
    } catch (e) {
      console.warn("Firestore collection lookup deferred:", e);
    }
  }

  // Return custom unsubs teardown
  return () => {
    // Teardown local subscription list
    const userSubs = subscribers.get(userId);
    if (userSubs) {
      userSubs.delete(callback);
      if (userSubs.size === 0) {
        subscribers.delete(userId);
      }
    }
    // Remove storage event listener
    window.removeEventListener('storage', handleStorageChange);
    // Unsubscribe from Firestore push listener
    unsubscribeFirestore();
  };
}
