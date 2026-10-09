
# Aplikasi Saldo

Aplikasi pencatatan saldo offline berdasarkan PRD: TypeScript + Vite + IndexedDB + PWA, dengan opsi APK Android melalui Capacitor. Tidak ada backend, akun, hosting wajib, atau sinkronisasi transaksi.

## Fitur yang sudah disiapkan

- Dashboard saldo, pemasukan, pengeluaran, dan maksimal lima transaksi terbaru.
- Tambah, edit, hapus, dan detail transaksi.
- Riwayat lengkap dengan pencarian, filter jenis, dan rentang tanggal.
- Pengaturan saldo awal.
- Ekspor dan impor backup JSON dengan validasi serta konfirmasi penggantian data.
- Ekspor CSV UTF-8 untuk spreadsheet/Excel.
- IndexedDB untuk penyimpanan lokal.
- Konfigurasi PWA dengan cache aset melalui `vite-plugin-pwa`.
- Konfigurasi Capacitor untuk menyiapkan APK Android.
- Pada APK, ekspor file menggunakan Filesystem dan dialog berbagi Android.

## Persyaratan

- Node.js versi LTS yang kompatibel dengan Vite 6 (disarankan Node.js 20 atau 22).
- npm.
- Untuk membangun APK: Android Studio, Android SDK, dan JDK yang didukung oleh versi Android Gradle Plugin yang dihasilkan Capacitor.

## Menjalankan versi web saat pengembangan

Buka terminal di folder proyek:

```bash
npm install
npm run dev
```

Buka URL lokal yang ditampilkan Vite. Data akan disimpan pada browser yang digunakan. Browser yang berbeda atau profil browser berbeda memiliki penyimpanan yang terpisah.

## Build web

```bash
npm run build
npm run preview
```

Folder hasil build berada di `dist/`.

## Menyiapkan APK Android

Jalankan perintah ini dari terminal proyek setelah dependensi terpasang:

```bash
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Android Studio akan membuka proyek Android. Tunggu Gradle Sync selesai, lalu gunakan menu Build untuk membuat APK. Untuk perubahan kode web berikutnya:

```bash
npm run build
npx cap sync android
```

Kemudian build ulang dari Android Studio.

Jika `npx cap add android` menyatakan platform sudah ada, jangan jalankan lagi; gunakan `npx cap sync android`.

## PWA dan hosting

PWA dikonfigurasi agar aset aplikasi dapat di-cache dan dipakai offline setelah instalasi/pemuatan awal. Pemasangan PWA melalui browser biasanya memerlukan origin HTTPS. Hosting tidak diperlukan untuk menjalankan APK yang telah dibangun. Pada pengembangan lokal, `localhost` dapat digunakan untuk pengujian.

## Data dan backup

- Data transaksi tidak dikirim ke server.
- JSON menyimpan saldo awal dan seluruh transaksi dengan versi format.
- Impor JSON mengganti data lokal setelah validasi dan konfirmasi.
- CSV adalah ekspor untuk spreadsheet, bukan format restore.
- Buat backup secara berkala. Menghapus data browser/aplikasi dapat menghilangkan database lokal.
- Database versi PWA dan APK berbeda; ekspor JSON dari satu instalasi lalu impor secara manual ke instalasi lain jika ingin memindahkan data.

## Struktur penting

```text
src/
├── database/db.ts              # IndexedDB dan operasi data
├── services/TransactionService.ts # Validasi dan perhitungan saldo
├── services/BackupService.ts   # JSON dan CSV
├── main.ts                     # UI dan event aplikasi
└── style.css                   # Tampilan responsif
public/icons/icon.svg
vite.config.ts
capacitor.config.ts
```

## Catatan pengembangan

Ini adalah fondasi MVP yang dapat dikembangkan. Sebelum distribusi produksi, uji build web dan APK pada perangkat target, termasuk mode pesawat, ekspor/impor, dan pemulihan setelah aplikasi ditutup.

