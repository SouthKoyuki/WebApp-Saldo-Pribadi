export type TransactionType = 'income' | 'expense';

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  key: 'settings';
  openingBalance: number;
}

export interface BackupDocument {
  app: 'Aplikasi Saldo';
  formatVersion: 1;
  exportedAt: string;
  openingBalance: number;
  transactions: TransactionRecord[];
}

const DB_NAME = 'aplikasi-saldo-db';
const DB_VERSION = 1;
const SETTINGS_KEY = 'settings';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('transactions')) {
        const store = db.createObjectStore('transactions', { keyPath: 'id' });
        store.createIndex('transactionDate', 'transactionDate', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Database tidak dapat dibuka.'));
    request.onblocked = () => reject(new Error('Database sedang digunakan oleh tab lain. Tutup tab aplikasi lain lalu coba lagi.'));
  });
}

async function getStore<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      let result!: T;
      let request: IDBRequest<T>;
      try {
        request = operation(tx.objectStore(storeName));
      } catch (error) {
        reject(error);
        return;
      }
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error ?? new Error('Operasi database gagal.'));
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? new Error('Transaksi database gagal.'));
      tx.onabort = () => reject(tx.error ?? new Error('Transaksi database dibatalkan.'));
    });
  } finally {
    db.close();
  }
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  const rows = await getStore('transactions', 'readonly', (store) => store.getAll());
  return (rows as TransactionRecord[]).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

export async function getTransaction(id: string): Promise<TransactionRecord | undefined> {
  return getStore('transactions', 'readonly', (store) => store.get(id)) as Promise<TransactionRecord | undefined>;
}

export async function saveTransaction(record: TransactionRecord): Promise<void> {
  await getStore('transactions', 'readwrite', (store) => store.put(record));
}

export async function removeTransaction(id: string): Promise<void> {
  await getStore('transactions', 'readwrite', (store) => store.delete(id));
}

export async function getOpeningBalance(): Promise<number> {
  const row = await getStore('settings', 'readonly', (store) => store.get(SETTINGS_KEY)) as AppSettings | undefined;
  return row?.openingBalance ?? 0;
}

export async function setOpeningBalance(openingBalance: number): Promise<void> {
  await getStore('settings', 'readwrite', (store) => store.put({ key: SETTINGS_KEY, openingBalance } satisfies AppSettings));
}

export async function getBackupDocument(): Promise<BackupDocument> {
  const [openingBalance, transactions] = await Promise.all([getOpeningBalance(), getTransactions()]);
  return { app: 'Aplikasi Saldo', formatVersion: 1, exportedAt: new Date().toISOString(), openingBalance, transactions };
}

export async function replaceAllData(openingBalance: number, transactions: TransactionRecord[]): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['transactions', 'settings'], 'readwrite');
      const transactionStore = tx.objectStore('transactions');
      transactionStore.clear();
      for (const record of transactions) transactionStore.put(record);
      tx.objectStore('settings').put({ key: SETTINGS_KEY, openingBalance } satisfies AppSettings);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Restore gagal.'));
      tx.onabort = () => reject(tx.error ?? new Error('Restore dibatalkan.'));
    });
  } finally {
    db.close();
  }
}
