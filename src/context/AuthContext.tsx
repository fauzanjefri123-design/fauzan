import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { verifyOfflineSessionSignature } from '../lib/validation';

interface UserData {
  role: 'Owner' | 'Employee' | 'Guest' | '';
  email: string;
  businessId?: string;
  ownerId?: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  authLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 30 Minutes Inactivity Timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // Auto logout after 30 minutes of inactivity
      timeoutId = setTimeout(() => {
        if (auth.currentUser || localStorage.getItem('offline_logged_in_user')) {
          console.log('Session expired due to 30 minutes of inactivity. Logging out...');
          localStorage.removeItem('offline_logged_in_user');
          if (auth.currentUser) {
            signOut(auth).then(() => {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        }
      }, 30 * 60 * 1000); 
    };

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimeout);
    });

    // Initialize timeout
    resetTimeout();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, []);

  useEffect(() => {
    // Listen to local changes (e.g. login/logout in tabs)
    const handleStorage = () => {
      const offlineUserStr = localStorage.getItem('offline_logged_in_user');
      if (offlineUserStr && !auth.currentUser) {
        try {
          const u = JSON.parse(offlineUserStr);
          if (!verifyOfflineSessionSignature(u)) {
            localStorage.removeItem('offline_logged_in_user');
            setUserData(null);
            return;
          }
          setUserData({
            role: u.role === 'Employee' || u.role === 'Karyawan' ? 'Employee' : (u.role === 'Guest' ? 'Guest' : 'Owner'),
            email: u.email || '',
            businessId: u.businessId || 'bus_offline_' + (u.email ? u.email.replace(/[^a-zA-Z0-9]/g, '_') : 'default'),
            ownerId: u.ownerId || (u.uid || 'owner_offline_default')
          });
        } catch (e) {
          setUserData(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Token expiry or refresh happens under the hood mostly, but we can forcefully getIdToken to ensure valid session
        try {
          await user.getIdToken(true);
        } catch (e) {
          console.error("Token might be expired", e);
          await signOut(auth);
          setCurrentUser(null);
          setUserData(null);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const mappedRole = data.role === 'owner' ? 'Owner' : (data.role === 'employee' ? 'Employee' : 'Guest');
            setUserData({
              role: mappedRole,
              email: data.email || user.email || '',
              businessId: data.businessId || 'bus_' + user.uid,
              ownerId: data.ownerId || user.uid,
            });
            localStorage.setItem('inmarket_user_role', mappedRole);
          } else {
            // handle fallback
            setUserData({ role: 'Guest', email: user.email || '' });
            localStorage.setItem('inmarket_user_role', 'Guest');
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData({ role: 'Guest', email: user.email || '' });
          localStorage.setItem('inmarket_user_role', 'Guest');
        }
      } else {
        const offlineUserStr = localStorage.getItem('offline_logged_in_user');
        if (offlineUserStr) {
          try {
            const u = JSON.parse(offlineUserStr);
            if (!verifyOfflineSessionSignature(u)) {
              localStorage.removeItem('offline_logged_in_user');
              setUserData(null);
            } else {
              const mappedRole = u.role === 'Employee' || u.role === 'Karyawan' ? 'Employee' : (u.role === 'Guest' ? 'Guest' : 'Owner');
              setUserData({
                role: mappedRole,
                email: u.email || '',
                businessId: u.businessId || 'bus_offline_' + (u.email ? u.email.replace(/[^a-zA-Z0-9]/g, '_') : 'default'),
                ownerId: u.ownerId || (u.uid || 'owner_offline_default')
              });
              localStorage.setItem('inmarket_user_role', mappedRole);
            }
          } catch (e) {
            setUserData(null);
          }
        } else {
          setUserData(null);
        }
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
