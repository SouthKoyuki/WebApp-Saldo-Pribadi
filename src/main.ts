import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  getOpeningBalance,
  getTransactions,
  getTransaction,
  removeTransaction,
  saveTransaction,
  setOpeningBalance,
  type TransactionRecord,
  type TransactionType
} from './database/db';
import { createCsvExport, createJsonBackup, restoreJsonBackup } from './services/BackupService';
import { createTransaction, getSummary, validateTransaction } from './services/TransactionService';
import './style.css';

const $ = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemen tidak ditemukan: ${selector}`);
  return element;
};

let selectedType: TransactionType = 'income';
let selectedTransactionId: string | null = null;
let openingBalance = 0;
let toastTimer: number | undefined;

const rupiah = (amount: number): string => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0
}).format(amount).replace(/\u00a0/g, '');

const dateLabel = (value: string): string => {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
};

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character] ?? character));

function showToast(message: string): void {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3200);
}

function goToPage(page: string): void {
  document.querySelectorAll<HTMLElement>('.page').forEach((element) => element.classList.toggle('active', element.id === `page-${page}`));
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((element) => element.classList.toggle('active', element.dataset.page === page));
  if (page === 'history') void renderHistory();
  if (page === 'settings') void renderSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function emptyState(title: string, detail: string): string {
  return `<div class="empty-state"><span class="empty-icon">▤</span><strong>${title}</strong><p>${detail}</p></div>`;
}

function transactionMarkup(transaction: TransactionRecord, showActions = false): string {
  const isIncome = transaction.type === 'income';
  return `<article class="transaction-row" data-transaction-id="${escapeHtml(transaction.id)}" tabindex="0" role="button" aria-label="Detail transaksi ${escapeHtml(transaction.description)}">
    <div class="transaction-symbol ${isIncome ? 'income' : 'expense'}">${isIncome ? '↙' : '↗'}</div>
    <div class="transaction-copy"><strong>${escapeHtml(transaction.description)}</strong><span>${dateLabel(transaction.transactionDate)} · ${isIncome ? 'Pemasukan' : 'Pengeluaran'}</span></div>
    <div class="transaction-amount ${isIncome ? 'income-text' : 'expense-text'}">${isIncome ? '+' : '−'}${rupiah(transaction.amount)}${showActions ? '<span class="row-chevron">›</span>' : ''}</div>
  </article>`;
}

async function renderDashboard(): Promise<void> {
  const [transactions, summary] = await Promise.all([getTransactions(), getSummary(openingBalance)]);
  $('#current-balance').textContent = rupiah(summary.balance);
  $('#current-balance').classList.toggle('negative-balance', summary.balance < 0);
  $('#total-income').textContent = rupiah(summary.income);
  $('#total-expense').textContent = rupiah(summary.expense);
  const recent = transactions.slice(0, 5);
  $('#recent-list').innerHTML = recent.length ? recent.map((transaction) => transactionMarkup(transaction, true)).join('') : emptyState('Belum ada transaksi', 'Tambahkan pemasukan atau pengeluaran pertamamu.');
  wireTransactionRows($('#recent-list'));
}

function wireTransactionRows(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('[data-transaction-id]').forEach((row) => {
    const open = () => void openDetail(row.dataset.transactionId ?? '');
    row.addEventListener('click', open);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
  });
}

async function renderHistory(): Promise<void> {
  const [transactions] = await Promise.all([getTransactions()]);
  const search = ($('#search-input') as HTMLInputElement).value.trim().toLocaleLowerCase('id-ID');
  const type = ($('#type-filter') as HTMLSelectElement).value;
  const from = ($('#date-from') as HTMLInputElement).value;
  const to = ($('#date-to') as HTMLInputElement).value;
  const filtered = transactions.filter((transaction) => {
    if (search && !transaction.description.toLocaleLowerCase('id-ID').includes(search)) return false;
    if (type !== 'all' && transaction.type !== type) return false;
    if (from && transaction.transactionDate < from) return false;
    if (to && transaction.transactionDate > to) return false;
    return true;
  });
  $('#history-count').textContent = `${filtered.length} dari ${transactions.length} transaksi`;
  $('#history-list').innerHTML = filtered.length ? filtered.map((transaction) => transactionMarkup(transaction, true)).join('') : emptyState(transactions.length ? 'Transaksi tidak ditemukan' : 'Belum ada transaksi', transactions.length ? 'Coba ubah kata kunci atau filter tanggal.' : 'Transaksi yang kamu catat akan muncul di sini.');
  wireTransactionRows($('#history-list'));
}

async function renderSettings(): Promise<void> {
  openingBalance = await getOpeningBalance();
  ($('#opening-balance-input') as HTMLInputElement).value = String(openingBalance);
}

function setTransactionType(type: TransactionType): void {
  selectedType = type;
  document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => button.classList.toggle('selected', button.dataset.choice === type));
  $('#dialog-title').textContent = `${selectedTransactionId ? 'Edit' : 'Tambah'} ${type === 'income' ? 'pemasukan' : 'pengeluaran'}`;
}

function openTransactionForm(type: TransactionType = 'income', transaction?: TransactionRecord): void {
  selectedTransactionId = transaction?.id ?? null;
  setTransactionType(transaction?.type ?? type);
  $('#dialog-eyebrow').textContent = transaction ? 'UBAH TRANSAKSI' : 'TRANSAKSI BARU';
  ($('#transaction-id') as HTMLInputElement).value = transaction?.id ?? '';
  ($('#amount-input') as HTMLInputElement).value = transaction ? String(transaction.amount) : '';
  ($('#description-input') as HTMLInputElement).value = transaction?.description ?? '';
  ($('#transaction-date-input') as HTMLInputElement).value = transaction?.transactionDate ?? todayLocal();
  $('#form-error').textContent = '';
  ($('#transaction-dialog') as HTMLDialogElement).showModal();
  window.setTimeout(() => $('#amount-input').focus(), 50);
}

async function openDetail(id: string): Promise<void> {
  const transaction = await getTransaction(id);
  if (!transaction) { showToast('Transaksi tidak ditemukan.'); return; }
  selectedTransactionId = id;
  const isIncome = transaction.type === 'income';
  $('#detail-content').innerHTML = `<div class="detail-amount ${isIncome ? 'income-text' : 'expense-text'}">${isIncome ? '+' : '−'}${rupiah(transaction.amount)}</div><dl class="detail-list"><div><dt>Jenis transaksi</dt><dd>${isIncome ? 'Pemasukan' : 'Pengeluaran'}</dd></div><div><dt>Keterangan</dt><dd>${escapeHtml(transaction.description)}</dd></div><div><dt>Tanggal transaksi</dt><dd>${dateLabel(transaction.transactionDate)}</dd></div><div><dt>Dibuat pada</dt><dd>${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(transaction.createdAt))}</dd></div><div><dt>Diperbarui pada</dt><dd>${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(transaction.updatedAt))}</dd></div></dl>`;
  ($('#detail-dialog') as HTMLDialogElement).showModal();
}

async function downloadFile(filename: string, content: string, mimeType: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(new Blob([content], { type: mimeType }));
    const result = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache, recursive: true });
    await Share.share({ title: filename, text: `File dari Aplikasi Saldo: ${filename}`, url: result.uri, dialogTitle: 'Simpan atau bagikan file' });
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('File tidak dapat diproses.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

function todayLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function wireEvents(): void {
  document.querySelectorAll<HTMLButtonElement>('.tab').forEach((button) => button.addEventListener('click', () => goToPage(button.dataset.page ?? 'dashboard')));
  document.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((button) => button.addEventListener('click', () => goToPage(button.dataset.go ?? 'dashboard')));
  $('#add-income').addEventListener('click', () => openTransactionForm('income'));
  $('#add-expense').addEventListener('click', () => openTransactionForm('expense'));
  $('#history-add').addEventListener('click', () => openTransactionForm('income'));
  document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => button.addEventListener('click', () => setTransactionType(button.dataset.choice as TransactionType)));
  $('#close-dialog').addEventListener('click', () => ($('#transaction-dialog') as HTMLDialogElement).close());
  $('#cancel-dialog').addEventListener('click', () => ($('#transaction-dialog') as HTMLDialogElement).close());
  $('#close-detail').addEventListener('click', () => ($('#detail-dialog') as HTMLDialogElement).close());
  $('#edit-transaction').addEventListener('click', async () => {
    const transaction = selectedTransactionId ? await getTransaction(selectedTransactionId) : undefined;
    ($('#detail-dialog') as HTMLDialogElement).close();
    if (transaction) openTransactionForm(transaction.type, transaction);
  });
  $('#delete-transaction').addEventListener('click', async () => {
    if (!selectedTransactionId) return;
    if (!window.confirm('Hapus transaksi ini? Tindakan ini tidak dapat dibatalkan.')) return;
    await removeTransaction(selectedTransactionId);
    ($('#detail-dialog') as HTMLDialogElement).close();
    await refreshAll();
    showToast('Transaksi berhasil dihapus.');
  });
  $('#transaction-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const amount = Number(($('#amount-input') as HTMLInputElement).value);
    const description = ($('#description-input') as HTMLInputElement).value;
    const transactionDate = ($('#transaction-date-input') as HTMLInputElement).value;
    const error = validateTransaction(selectedType, amount, description, transactionDate);
    if (error) { $('#form-error').textContent = error; return; }
    try {
      const existing = selectedTransactionId ? await getTransaction(selectedTransactionId) : undefined;
      const record = createTransaction(selectedType, amount, description, transactionDate, existing);
      await saveTransaction(record);
      ($('#transaction-dialog') as HTMLDialogElement).close();
      await refreshAll();
      showToast(existing ? 'Transaksi berhasil diperbarui.' : 'Transaksi berhasil disimpan.');
    } catch (errorValue) {
      $('#form-error').textContent = errorValue instanceof Error ? errorValue.message : 'Transaksi gagal disimpan.';
    }
  });
  ['search-input', 'type-filter', 'date-from', 'date-to'].forEach((id) => $( `#${id}`).addEventListener('input', () => void renderHistory()));
  $('#clear-filters').addEventListener('click', () => {
    ($('#search-input') as HTMLInputElement).value = '';
    ($('#type-filter') as HTMLSelectElement).value = 'all';
    ($('#date-from') as HTMLInputElement).value = '';
    ($('#date-to') as HTMLInputElement).value = '';
    void renderHistory();
  });
  $('#opening-balance-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const amount = Number(($('#opening-balance-input') as HTMLInputElement).value);
    if (!Number.isSafeInteger(amount) || amount < 0) { showToast('Saldo awal harus nol atau nominal rupiah bulat positif.'); return; }
    await setOpeningBalance(amount);
    openingBalance = amount;
    await renderDashboard();
    showToast('Saldo awal berhasil disimpan.');
  });
  $('#export-json').addEventListener('click', async () => {
    try { await downloadFile(`backup-saldo-${todayLocal()}.json`, await createJsonBackup(), 'application/json;charset=utf-8'); showToast('Backup JSON berhasil dibuat.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Ekspor JSON gagal.'); }
  });
  $('#export-csv').addEventListener('click', async () => {
    try { await downloadFile(`transaksi-saldo-${todayLocal()}.csv`, await createCsvExport(), 'text/csv;charset=utf-8'); showToast('CSV berhasil dibuat.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Ekspor CSV gagal.'); }
  });
  $('#import-json').addEventListener('click', () => ($('#import-file') as HTMLInputElement).click());
  $('#import-file').addEventListener('change', async () => {
    const input = $('#import-file') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { transactions?: unknown };
      const count = Array.isArray(parsed.transactions) ? parsed.transactions.length : 0;
      if (!window.confirm(`File ini berisi sekitar ${count} transaksi. Impor akan MENGGANTI seluruh data lokal saat ini. Lanjutkan?`)) { input.value = ''; return; }
      const restoredCount = await restoreJsonBackup(text);
      openingBalance = await getOpeningBalance();
      await refreshAll();
      showToast(`Backup dipulihkan: ${restoredCount} transaksi.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Impor JSON gagal.');
    } finally { input.value = ''; }
  });
}

async function refreshAll(): Promise<void> {
  openingBalance = await getOpeningBalance();
  await renderDashboard();
  if ($('#page-history').classList.contains('active')) await renderHistory();
  if ($('#page-settings').classList.contains('active')) await renderSettings();
}

async function start(): Promise<void> {
  try {
    if (!('indexedDB' in window)) throw new Error('Browser ini tidak mendukung IndexedDB.');
    openingBalance = await getOpeningBalance();
    wireEvents();
    await refreshAll();
    if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
      window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
    }
  } catch (error) {
    document.body.innerHTML = `<main class="fatal-error"><h1>Aplikasi tidak dapat dibuka</h1><p>${escapeHtml(error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.')}</p></main>`;
  }
}

void start();
