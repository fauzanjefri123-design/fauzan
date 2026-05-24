import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeJsonParse(jsonStr: string | null | undefined, defaultValue: any) {
  if (!jsonStr) return defaultValue;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return defaultValue;
  }
}

import { auth } from './firebase';

export function getTenantPrefix(): string {
  if (typeof window === 'undefined') return 'tenant_';
  // Check live firebase user first
  if (auth.currentUser) {
     return `tenant_${auth.currentUser.uid}_`;
  }
  
  // Fallback to offline user
  const offlineUserStr = localStorage.getItem('offline_logged_in_user');
  if (offlineUserStr) {
    try {
      const u = safeJsonParse(offlineUserStr, null);
      const isEmp = u?.role === 'Employee' || u?.role === 'Karyawan' || u?.email?.includes('karyawan') || u?.email?.includes('employee');
      if (isEmp) {
        const empProfStr = localStorage.getItem('inmarket_employee_profile');
        if (empProfStr) {
          const emp = safeJsonParse(empProfStr, {});
          if (emp.ownerId) {
            return `tenant_${emp.ownerId}_`;
          } else if (emp.ownerEmail) {
             return `tenant_${emp.ownerEmail.replace(/[^a-zA-Z0-9]/g, '_')}_`;
          }
        }
        return 'unlinked_tenant_'; // Indicates not linked to an owner
      }
      if (u.uid) return `tenant_${u.uid}_`;
      return `tenant_${(u.email || '').replace(/[^a-zA-Z0-9]/g, '_')}_`;
    } catch {
      return 'tenant_';
    }
  }
  return 'tenant_';
}

export function getCurrentStoreId(): string {
  if (typeof window === 'undefined') return 's1';
  return localStorage.getItem('inmarket_current_store_id') || 's1';
}

export function getPartitionedKey(baseKey: string, isBranchScoped = false): string {
  const tenant = getTenantPrefix();
  if (isBranchScoped) {
    const storeId = getCurrentStoreId();
    return `${baseKey}_${tenant}${storeId}`;
  }
  return `${baseKey}_${tenant}`;
}
