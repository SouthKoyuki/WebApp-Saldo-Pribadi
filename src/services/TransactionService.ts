import { getTransactions, type TransactionRecord, type TransactionType } from '../database/db';

export interface BalanceSummary {
  openingBalance: number;
  income: number;
  expense: number;
  balance: number;
}

export function calculateSummary(openingBalance: number, transactions: TransactionRecord[]): BalanceSummary {
  let income = 0;
  let expense = 0;
  for (const transaction of transactions) {
    if (transaction.type === 'income') income += transaction.amount;
    else expense += transaction.amount;
  }
  return { openingBalance, income, expense, balance: openingBalance + income - expense };
}

export function validateTransaction(type: TransactionType, amount: number, description: string, date: string): string | null {
  if (type !== 'income' && type !== 'expense') return 'Pilih jenis transaksi yang valid.';
  if (!Number.isSafeInteger(amount) || amount <= 0) return 'Nominal harus berupa angka rupiah bulat yang lebih besar dari nol.';
  if (!description.trim()) return 'Keterangan wajib diisi.';
  if (description.trim().length > 200) return 'Keterangan maksimal 200 karakter.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) return 'Tanggal transaksi tidak valid.';
  return null;
}

export async function getSummary(openingBalance: number): Promise<BalanceSummary> {
  return calculateSummary(openingBalance, await getTransactions());
}

export function createTransaction(type: TransactionType, amount: number, description: string, transactionDate: string, existing?: TransactionRecord): TransactionRecord {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    type,
    amount,
    description: description.trim(),
    transactionDate,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}
