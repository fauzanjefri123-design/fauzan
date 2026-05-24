import { db, auth } from './firebase';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, runTransaction, getDoc
} from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// EXPENSES INTERACTION
export function getExpenses(ownerId: string, onUpdate: (data: any[]) => void, onError?: (err: any) => void) {
  const path = 'expenses';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const expensesList: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.ownerId === ownerId) {
          expensesList.push({ id: doc.id, ...data });
        }
      });
      // Sort expenses by date descending
      expensesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onUpdate(expensesList);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function addExpense(ownerId: string, expense: any) {
  const path = 'expenses';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...expense,
      ownerId,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteExpense(ownerId: string, expenseId: string) {
  const path = `expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// CUSTOMERS INTERACTION
export function getCustomers(ownerId: string, onUpdate: (data: any[]) => void, onError?: (err: any) => void) {
  const path = 'customers';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const customersList: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.ownerId === ownerId) {
          customersList.push({ id: docSnap.id, ...data });
        }
      });
      onUpdate(customersList);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function addCustomer(ownerId: string, customer: any) {
  const path = 'customers';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...customer,
      ownerId,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCustomer(ownerId: string, customerId: string, latestData: any) {
  const path = `customers/${customerId}`;
  try {
    await updateDoc(doc(db, 'customers', customerId), latestData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCustomer(ownerId: string, customerId: string) {
  const path = `customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// WALLET INTERACTION
export function getWalletData(userId: string, onUpdate: (data: any) => void, onError?: (err: any) => void) {
  const path = `wallets/${userId}`;
  return onSnapshot(
    doc(db, 'wallets', userId),
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      } else {
        onUpdate({ userId, balance: 0, transactions: [] });
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function updateWalletBalance(userId: string, deltaAmount: number, newTx: any) {
  const path = `wallets/${userId}`;
  const walletRef = doc(db, 'wallets', userId);
  try {
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      let currentBalance = 0;
      let transactionsList: any[] = [];
      
      if (walletDoc.exists()) {
        const data = walletDoc.data();
        currentBalance = data.balance || 0;
        transactionsList = data.transactions || [];
      }
      
      const updatedBalance = currentBalance + deltaAmount;
      const updatedTx = { ...newTx, date: new Date().toLocaleString() };
      
      transaction.set(walletRef, {
        userId,
        balance: updatedBalance,
        transactions: [updatedTx, ...transactionsList]
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// LOGIN LOGS INTERACTION
export function getLoginLogs(userId: string, onUpdate: (data: any[]) => void, onError?: (err: any) => void) {
  const path = 'loginLogs';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const logsList: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === userId) {
          logsList.push({ id: docSnap.id, ...data });
        }
      });
      // Sort logs by timestamp descending
      logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(logsList);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function addLoginLog(userId: string, log: any) {
  const path = 'loginLogs';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...log,
      userId,
      timestamp: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ATTENDANCE INTERACTION
export async function addAttendanceEntry(ownerId: string, attendance: any) {
  const path = 'attendance';
  try {
    const docRef = await addDoc(collection(db, path), {
      ...attendance,
      ownerId,
      timestamp: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
