Baik, kita revisi arsitektur Aplikasi Saldo dengan pendekatan PWA sebagai aplikasi utama, ditambah APK Android jika memungkinkan, serta fitur ekspor/impor JSON dan ekspor CSV.

Keputusan utamanya tetap sama: aplikasi sederhana, ringan, dapat digunakan secara offline, dan setiap perangkat menyimpan transaksi secara mandiri. Tidak ada backend, akun pengguna, maupun sinkronisasi transaksi.

# PRD Final — Aplikasi Saldo

# Aplikasi Saldo

Product Requirements Document · Revisi arsitektur PWA + APK

Offline-first

Local storage

PWA + APK

Tanpa backend

## 1. Ringkasan produk

Aplikasi Saldo adalah aplikasi pencatatan keuangan pribadi yang digunakan untuk mencatat pemasukan, pengeluaran, saldo, dan riwayat transaksi melalui HP Android.

Aplikasi dirancang agar dapat digunakan tanpa internet setelah instalasi dan persiapan awal selesai. Data transaksi disimpan di perangkat masing-masing, bukan di server.

Target pengguna adalah beberapa orang yang menggunakan aplikasi di perangkat masing-masing dengan catatan transaksi yang sepenuhnya terpisah.

### Tujuan produk

- Mencatat transaksi dengan cepat dan sederhana.
- Menampilkan saldo terkini secara otomatis.
- Menyediakan riwayat transaksi yang informatif.
- Menjaga data tetap tersimpan secara lokal.
- Mendukung pencadangan dan pemulihan data secara mandiri.
- Menghindari kompleksitas, biaya, dan pemeliharaan backend.

## 2. Ruang lingkup

Termasuk dalam versi awal

- Dashboard saldo dan ringkasan transaksi.
- Tambah, edit, dan hapus transaksi.
- Riwayat dan pencarian/filter transaksi.
- Perhitungan saldo otomatis.
- Penyimpanan lokal dan penggunaan offline.
- Ekspor/impor JSON untuk backup dan restore.
- Ekspor CSV yang kompatibel dengan Excel.
- Instalasi PWA dan opsi APK Android.

Tidak termasuk dalam versi awal

- Login atau registrasi.
- Backend dan database server.
- Sinkronisasi antarperangkat.
- Integrasi rekening bank atau dompet digital.
- Transfer uang sungguhan.
- Notifikasi berbasis server.
- Analitik keuangan kompleks dan fitur akuntansi.

## 3. Arsitektur teknis final

Saya menyarankan TypeScript + Vite + IndexedDB + PWA, dengan Capacitor sebagai jalur pembuatan APK Android.

Arsitektur ini memungkinkan kita memakai satu basis kode untuk versi web dan Android, tanpa membangun dua aplikasi terpisah.

Satu basis kode

TypeScript · Vite · HTML/CSS

PWA

Browser dan layar utama

APK Android

Capacitor

IndexedDB lokal

Transaksi disimpan di masing-masing perangkat

### Komponen yang digunakan

| Komponen         | Fungsi                                      |
| ---------------- | ------------------------------------------- |
| TypeScript       | Logika transaksi dan perhitungan saldo      |
| Vite             | Development server dan proses build web     |
| HTML/CSS         | Antarmuka responsif untuk HP                |
| IndexedDB        | Penyimpanan transaksi lokal                 |
| Service Worker   | Cache aplikasi untuk penggunaan offline     |
| Web App Manifest | Nama, ikon, dan konfigurasi instalasi PWA   |
| Capacitor        | Membungkus aplikasi web menjadi APK Android |

Mengapa bukan Android Studio sebagai alat utama? Pengembangan antarmuka dan logika dapat dilakukan menggunakan editor kode biasa. Android Studio atau Android SDK mungkin tetap diperlukan pada tahap pembangunan APK Android, tetapi kita tidak perlu mengembangkan UI Android native dari awal.

### Catatan penting tentang hosting

Karena kita ingin menghindari hosting, distribusi awal sebaiknya mengutamakan APK yang dapat dipasang langsung di HP. APK dapat memuat seluruh aset aplikasi dan menggunakan database lokal tanpa server.

Versi PWA tetap menjadi target arsitektur, tetapi pemasangan PWA melalui browser umumnya membutuhkan situs HTTPS. Jadi, PWA yang bisa dipasang lewat browser tidak dapat dijamin tersedia tanpa alamat web yang aman. Hosting statis dapat ditambahkan kemudian jika kamu ingin mendistribusikan versi PWA tersebut.

## 4. Spesifikasi fitur

### 4.1 Dashboard

Halaman utama menampilkan informasi penting tanpa memenuhi layar dengan elemen yang tidak diperlukan.

- Saldo saat ini.
- Total pemasukan.
- Total pengeluaran.
- Maksimal lima transaksi terbaru.
- Tombol tambah pemasukan dan pengeluaran.
- Navigasi ke seluruh riwayat dan pengaturan.

Semua nominal ditampilkan dalam format Rupiah, misalnya `Rp1.250.000`.

### 4.2 Pencatatan transaksi

Setiap transaksi mempunyai kolom berikut:

| Kolom             | Ketentuan                       |
| ----------------- | ------------------------------- |
| ID                | Dibuat otomatis dan unik        |
| Jenis             | Pemasukan atau pengeluaran      |
| Nominal           | Wajib, lebih besar dari nol     |
| Keterangan        | Wajib diisi                     |
| Tanggal transaksi | Wajib diisi                     |
| Dibuat pada       | Timestamp otomatis              |
| Diperbarui pada   | Timestamp saat transaksi diubah |

Pengguna dapat menambah, melihat, mengedit, dan menghapus transaksi. Pengguna memasukkan nominal positif; jenis transaksi menentukan apakah nominal menambah atau mengurangi saldo.

Kategori transaksi tidak diwajibkan dalam versi awal agar pencatatan tetap sederhana.

### 4.3 Perhitungan saldo

Rumus utama:

Saldo=Saldo Awal+Pemasukan−Pengeluaran\text{Saldo}=\text{Saldo Awal}+\text{Pemasukan}-\text{Pengeluaran}Saldo=Saldo Awal+Pemasukan−Pengeluaran

Saldo awal ditetapkan melalui pengaturan. Nilainya dapat berupa nol atau nominal yang dimasukkan pengguna.

Aturan perhitungan:

- Pemasukan menambah saldo.
- Pengeluaran mengurangi saldo.
- Edit transaksi menghitung ulang saldo berdasarkan data terbaru.
- Hapus transaksi memperbarui saldo secara otomatis.
- Saldo negatif diperbolehkan dan tidak otomatis memblokir transaksi.

Saldo merupakan hasil perhitungan dari saldo awal dan transaksi tersimpan, bukan angka yang diperbarui secara terpisah tanpa rekonsiliasi.

### 4.4 Riwayat transaksi

Riwayat menyediakan:

- Daftar transaksi dari yang terbaru.
- Filter pemasukan dan pengeluaran.
- Pencarian berdasarkan keterangan.
- Filter rentang tanggal.
- Informasi nominal, tanggal, dan jenis transaksi.
- Akses untuk melihat, mengedit, dan menghapus transaksi.

Jika belum ada transaksi, aplikasi menampilkan kondisi kosong dengan petunjuk untuk mencatat transaksi pertama.

### 4.5 Backup dan restore JSON

Fitur backup wajib disediakan agar data dapat dipindahkan atau dipulihkan secara manual.

Ekspor JSON

- Menghasilkan satu file yang berisi saldo awal, seluruh transaksi, dan metadata format.
- Menggunakan versi skema agar format dapat dikembangkan pada pembaruan berikutnya.
- Tidak mengirim data ke server.

Impor JSON

- Memvalidasi struktur dan versi file.
- Menolak file rusak atau tidak sesuai format.
- Menampilkan ringkasan sebelum data diterapkan.
- Menyediakan pilihan untuk mengganti seluruh data lokal atau membatalkan proses.
- Menghindari penggabungan data otomatis yang berpotensi menghasilkan transaksi ganda.

Sebelum pemulihan dilakukan, aplikasi harus menjelaskan bahwa penggantian data akan menimpa data lokal saat ini. Sebaiknya pengguna membuat backup terlebih dahulu.

### 4.6 Ekspor CSV untuk Excel

CSV digunakan untuk membuka dan mengolah data transaksi di spreadsheet.

Kolom yang disarankan:

`ID, Tanggal, Jenis, Keterangan, Nominal`

Ketentuan:

- Satu transaksi per baris.
- Nominal disimpan sebagai angka, bukan teks berformat Rupiah.
- Keterangan yang mengandung koma, tanda kutip, atau baris baru harus di-escape sesuai aturan CSV.
- Format tanggal konsisten.
- Pengujian kompatibilitas Excel, termasuk karakter UTF-8 dan pemisah kolom.

CSV hanya untuk ekspor pada versi awal. Impor dan pemulihan data menggunakan JSON agar struktur data lebih terjaga.

## 5. Penyimpanan dan keamanan data

### 5.1 Data terpisah per perangkat

Setiap instalasi mempunyai database sendiri. Tidak ada identitas pengguna atau mekanisme berbagi transaksi.

Contohnya, jika tiga orang menggunakan Aplikasi Saldo:

- HP A menyimpan transaksi A.
- HP B menyimpan transaksi B.
- HP C menyimpan transaksi C.

Data tidak dikirim ke perangkat lain. Jika pengguna ingin memindahkan transaksi, prosesnya dilakukan secara manual melalui file JSON.

### 5.2 Aturan penyimpanan

- Database transaksi menggunakan IndexedDB.
- Semua operasi tulis harus divalidasi.
- Pembaruan transaksi dilakukan secara konsisten agar saldo dan riwayat tidak berbeda.
- Data tetap tersedia setelah aplikasi ditutup dan dibuka kembali.
- Aplikasi tidak menghapus transaksi secara otomatis.
- Aplikasi tidak mengirim data transaksi ke layanan analitik atau server.

Untuk versi APK, database disimpan dalam lingkungan aplikasi yang terisolasi. Untuk versi PWA, data berada pada penyimpanan situs di browser. Keduanya merupakan penyimpanan berbeda, sehingga data tidak otomatis sama meskipun berasal dari basis kode yang sama.

Batasan penting: penyimpanan lokal bukan pengganti backup. Penghapusan data aplikasi atau browser, kerusakan perangkat, dan kehilangan HP dapat menghilangkan data yang belum dicadangkan.

## 6. Persyaratan offline

Aplikasi harus mendukung penggunaan tanpa internet setelah seluruh komponen yang diperlukan tersedia secara lokal.

| Fitur                                     | Harus bisa offline?                      |
| ----------------------------------------- | ---------------------------------------- |
| Membuka dashboard                         | Ya                                       |
| Melihat saldo                             | Ya                                       |
| Menambah transaksi                        | Ya                                       |
| Mengedit dan menghapus transaksi          | Ya                                       |
| Melihat dan memfilter riwayat             | Ya                                       |
| Backup JSON                               | Ya                                       |
| Restore JSON                              | Ya                                       |
| Ekspor CSV                                | Ya                                       |
| Memasang PWA pertama kali melalui browser | Umumnya membutuhkan HTTPS dan akses awal |
| Mengunduh APK dari tautan                 | Membutuhkan akses ke file APK            |

Versi APK harus dapat digunakan tanpa internet sejak pertama kali dibuka setelah instalasi.

## 7. Desain antarmuka

Desain mengikuti preferensi aplikasi yang sederhana, informatif, dan mudah dibaca.

Struktur layar utama

Aplikasi Saldo

Saldo saat ini

# Rp1.250.000

Pemasukan

### Rp1.500.000

Pengeluaran

### Rp250.000

Pemasukan

Pengeluaran

Transaksi terbaru

Gaji

Hari ini

+Rp1.500.000

Makan

Hari ini

−Rp250.000

Ilustrasi struktur dashboard, bukan hasil implementasi. Angka transaksi hanya contoh tampilan.

Prinsip UI:

- Mobile-first dan responsif.
- Ukuran teks mudah dibaca.
- Warna pemasukan dan pengeluaran dibedakan dengan jelas.
- Tombol utama mudah dijangkau.
- Form transaksi tidak memiliki kolom yang tidak diperlukan.
- Tidak menggunakan animasi berat atau grafik dekoratif berlebihan.
- Mendukung tampilan terang dan gelap jika implementasinya tetap sederhana.

## 8. Persyaratan nonfungsional

- Performa: operasi transaksi dan perhitungan saldo harus terasa cepat untuk penggunaan harian.
- Konsistensi: saldo harus sesuai dengan saldo awal dan seluruh transaksi.
- Reliabilitas: perubahan database menggunakan transaksi IndexedDB agar operasi terkait tidak meninggalkan data setengah diperbarui.
- Privasi: tidak ada pengiriman data ke server.
- Portabilitas: data dapat dicadangkan ke JSON dan dibuka dalam bentuk tabel melalui CSV.
- Pemeliharaan: kode dipisahkan antara UI, layanan transaksi, database, dan backup.
- Kompatibilitas: mendukung browser Android modern dan APK yang dibangun dari basis kode yang sama.

## 9. Struktur proyek yang direncanakan

```
aplikasi-saldo/
├── public/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── ...
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── Dashboard
│   │   ├── Transactions
│   │   └── Settings
│   ├── services/
│   │   ├── TransactionService
│   │   ├── BalanceService
│   │   └── BackupService
│   ├── database/
│   │   ├── db
│   │   └── migrations
│   ├── utils/
│   └── main.ts
├── capacitor.config.ts
├── package.json
└── vite.config.ts
```

Struktur tersebut merupakan rancangan awal. Nama file dan pembagian modul final akan mengikuti implementasi aktual.

## 10. Kriteria penerimaan

Aplikasi dianggap memenuhi PRD apabila seluruh pengujian berikut berhasil.

## Checklist pengujian

0/15

Transaksi dan saldo

Pemasukan menambah saldo dengan benar.

Pengeluaran mengurangi saldo dengan benar.

Edit dan hapus transaksi memperbarui saldo dengan benar.

Nominal nol atau negatif ditolak sebagai input transaksi.

Saldo dan transaksi tetap tersedia setelah aplikasi dibuka kembali.

Riwayat

Filter jenis, pencarian keterangan, dan rentang tanggal berfungsi.

Urutan transaksi terbaru tampil dengan benar.

Backup dan ekspor

JSON dapat diekspor dan dipulihkan tanpa kehilangan data yang didukung.

JSON rusak ditolak tanpa merusak data yang sudah ada.

Penggantian data meminta konfirmasi sebelum menimpa data lokal.

CSV dapat dibuka di Excel dengan kolom, nominal, dan karakter yang benar.

Offline dan distribusi

Fitur transaksi, riwayat, dan backup berjalan tanpa internet.

APK dapat dipasang dan dijalankan pada HP Android yang didukung.

PWA dapat dipasang melalui HTTPS dan tetap berjalan offline setelah persiapan awal.

Data satu instalasi tidak otomatis masuk ke instalasi lainnya.

Salin checklist pengujian

## 11. Tahapan pengembangan

1. Tahap 1 — Fondasi proyek

   Menyiapkan proyek TypeScript, Vite, UI responsif, dan struktur modul.
2. Tahap 2 — Database dan transaksi

   Membuat IndexedDB, saldo awal, CRUD transaksi, validasi, dan perhitungan saldo.
3. Tahap 3 — Dashboard dan riwayat

   Membuat halaman utama, pencarian, filter, dan navigasi.
4. Tahap 4 — Backup dan restore

   Membuat ekspor/impor JSON dan ekspor CSV beserta validasinya.
5. Tahap 5 — Offline dan PWA

   Menyiapkan manifest, ikon, Service Worker, cache aset, dan pengujian offline.
6. Tahap 6 — APK Android

   Mengintegrasikan Capacitor, menyiapkan Android project, lalu membangun APK untuk dipasang langsung di HP.
7. Tahap 7 — Pengujian dan rilis

   Menguji konsistensi saldo, pemulihan data, penggunaan offline, dan instalasi pada perangkat Android.

## 12. Keputusan teknis yang dikunci

| Keputusan             | Pilihan final                         |
| --------------------- | ------------------------------------- |
| Bentuk aplikasi       | PWA + APK jika memungkinkan           |
| Bahasa                | TypeScript                            |
| Tool build web        | Vite                                  |
| Database lokal        | IndexedDB                             |
| Pembungkus Android    | Capacitor                             |
| Penyimpanan transaksi | Lokal per instalasi                   |
| Backend dan login     | Tidak ada                             |
| Sinkronisasi          | Tidak ada                             |
| Backup                | JSON ekspor/impor                     |
| Ekspor spreadsheet    | CSV                                   |
| Hosting               | Tidak diwajibkan untuk distribusi APK |
| Penggunaan offline    | Wajib                                 |
| Target utama          | HP Android                            |

Catatan rilis: APK adalah jalur distribusi yang paling sesuai jika kamu ingin benar-benar menghindari hosting. PWA tetap disiapkan sebagai bagian dari proyek, tetapi distribusi melalui browser memerlukan HTTPS. Jika suatu saat kamu ingin menggunakan PWA tanpa memasang APK, hosting statis gratis dapat dipertimbangkan tanpa menambahkan backend.

Dengan demikian, PRD ini menjadi acuan pengembangan Aplikasi Saldo versi awal. Fokusnya adalah aplikasi yang ringan, mudah dipelihara, tidak membutuhkan server, serta memiliki mekanisme cadangan agar data transaksi tetap dapat dipulihkan ketika perangkat atau instalasi bermasalah.