import { getBackupDocument, replaceAllData, type BackupDocument, type TransactionRecord } from '../database/db';

export async function createJsonBackup(): Promise<string> {
  return JSON.stringify(await getBackupDocument(), null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateBackup(input: unknown): BackupDocument {
  if (!isRecord(input) || input.app !== 'Aplikasi Saldo' || input.formatVersion !== 1) {
    throw new Error('File bukan backup Aplikasi Saldo versi 1 yang didukung.');
  }
  if (typeof input.openingBalance !== 'number' || !Number.isSafeInteger(input.openingBalance) || input.openingBalance < 0) {
    throw new Error('Nilai saldo awal pada file tidak valid.');
  }
  if (!Array.isArray(input.transactions)) throw new Error('Daftar transaksi tidak ditemukan.');
  const ids = new Set<string>();
  const transactions: TransactionRecord[] = input.transactions.map((item: unknown) => {
    if (!isRecord(item)) throw new Error('Ada transaksi dengan format yang tidak valid.');
    const { id, type, amount, description, transactionDate, createdAt, updatedAt } = item;
    if (typeof id !== 'string' || !id || ids.has(id)) throw new Error('ID transaksi kosong atau duplikat.');
    ids.add(id);
    if (type !== 'income' && type !== 'expense') throw new Error('Jenis transaksi pada file tidak valid.');
    if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Nominal transaksi pada file tidak valid.');
    if (typeof description !== 'string' || !description.trim() || description.length > 200) throw new Error('Keterangan transaksi pada file tidak valid.');
    if (typeof transactionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) || Number.isNaN(Date.parse(`${transactionDate}T00:00:00`))) throw new Error('Tanggal transaksi pada file tidak valid.');
    if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt)) || typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt))) throw new Error('Waktu transaksi pada file tidak valid.');
    return { id, type, amount, description, transactionDate, createdAt, updatedAt };
  });
  return {
    app: 'Aplikasi Saldo',
    formatVersion: 1,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
    openingBalance: input.openingBalance,
    transactions
  };
}

export async function restoreJsonBackup(text: string): Promise<number> {
  let parsed: unknown;
  try { parsed = JSON.parse(text) as unknown; } catch { throw new Error('File JSON tidak dapat dibaca.'); }
  const backup = validateBackup(parsed);
  await replaceAllData(backup.openingBalance, backup.transactions);
  return backup.transactions.length;
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function createCsvExport(): Promise<string> {
  const backup = await getBackupDocument();
  const header = ['ID', 'Tanggal', 'Jenis', 'Keterangan', 'Nominal'];
  const rows = backup.transactions.map((transaction) => [
    transaction.id,
    transaction.transactionDate,
    transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    transaction.description,
    transaction.amount
  ]);
  // BOM membantu Excel mengenali UTF-8 pada banyak konfigurasi Windows.
  return '\uFEFF' + [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}
