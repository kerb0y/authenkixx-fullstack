# Prototype Full-Stack (Capstone Authenkixx)

Ini masih prototype, ya. Dibuat oleh Ade Bintang. Semua datanya
dummy. Nggak ada data asli UMKM, nggak ada data customer, nggak ada
password, dan nggak ada sinkronisasi otomatis ke platform lain.

## Data baru: katalog Nike dummy (25 Oktober 2026)

Inventory lama yang cuma 6 produk generik sudah diganti dengan
katalog dummy Nike: 120 produk (Sneakers 48, Running 30,
Trail Running 18, Sandal dan Clogs 12, Basketball 6, Training 6),
total stok dummy 2.302, dengan 90 tersedia, 24 menipis, dan 6 habis.
ID produknya sekarang NK-DUMMY-001 sampai NK-DUMMY-120, dan Data
Science sekarang pakai produk yang sama, jadi nggak ada lagi
ketidakcocokan seperti di Fase 1 antara inventory dan ringkasan
Data Science. Demo statis GitHub Pages juga sudah dibuat ulang dari
data baru ini. Smoke test diperbarui ke produk NK-DUMMY-001 dan
total Data Science baru, tetap 11/11 lolos.

## Yang berubah di Fase 1 (25 Oktober 2026)

- Endpoint `GET /api/v1/insights` sekarang ikut menampilkan bagian
  `data_science` yang dibaca dari
  `data-science/outputs/business_summary.json` dan
  `baseline_model.json` (loader-nya ada di
  `backend/src/ds_outputs.js`). Foldernya diatur lewat
  `DS_OUTPUTS_DIR` (default-nya `../../data-science/outputs` kalau
  dilihat dari `fullstack/backend`). Kalau file-nya nggak ketemu,
  endpoint tetap jalan dan cuma menampilkan insights dari inventory,
  dengan `data_science: null` plus catatan yang jelas, jadi nggak
  sampai crash.
- Halaman ringkasan bisnis di frontend sekarang menampilkan total
  dari Data Science, unit per kanal, ringkasan stok menipis, dan
  metrik model baseline, semuanya tetap dilabeli dummy (atau catatan
  kalau output-nya lagi nggak ada).
- Smoke test jadi 11/11 lolos (8 yang lama ditambah 3 cek baru di
  Fase 1: bagian DS ada dan dilabeli dummy, total DS cocok dengan
  output dummy, dan fallback kalau folder-nya hilang).
- Fase 1 ini sudah di-push ke GitHub.

## Repo ini isinya apa

Ini prototype Full-Stack yang frontend dan backend-nya dipisah,
buat ngatur inventory terpusat:

- Backend: Express, rute API di bawah `/api/v1/` (produk, pergerakan
  stok, insights, dan proxy AI).
- Frontend: Vite, Tailwind CSS (di prototype ini masih lewat CDN,
  buat versi produksi nanti diinstal beneran), Axios buat
  networking, dan layout yang responsif.
- Halaman-halamannya simpel tapi beneran jalan, bukan cuma mockup:
  daftar produk, detail produk (plus riwayat stok), update stok,
  panel chat AI, dan halaman ringkasan bisnis.

Pengguna utamanya cuma pemilik toko (prototype single-user, belum
ada sistem login, itu masuk kerjaan lanjutan kalau tim memang mau).

## Backend

```bash
cd backend
npm install
npm start          # port 3001
npm run smoke      # smoke test (terverifikasi: 11/11 lolos)
```

- Penyimpanan buat prototype: `backend/data/inventory.json` dan
  `backend/data/ai_history.json`. Buat prototype, file JSON kayak
  gini udah cukup, nanti kalau udah produksi bisa pindah ke
  Neon/Postgres.
- Validasi skema pakai Joi (`backend/src/validation.js`). Kalau
  input-nya nggak valid, dibalas HTTP 400 dengan pesan yang jelas
  dan datanya nggak ikut tersimpan.
- Sukses, gagal, dan loading: semua respons API pakai format
  `{ status: "success", data }` atau `{ status: "error", message }`,
  dan frontend menampilkan status loading, sukses, dan error di
  tiap halaman.
- Akses Gen AI: backend yang jadi perantara buat chat AI
  (`POST /api/v1/ai/chat` -> `GENAI_SERVICE_URL`, default-nya
  http://127.0.0.1:8000/chat). Frontend NGGAK PERNAH manggil service
  Gen AI langsung. Kalau Gen AI lagi down, backend membalas HTTP 502
  dengan pesan yang jelas, bukan malah crash.
- Riwayat Gen AI: setiap chat yang lewat proxy disimpan di
  `backend/data/ai_history.json` (cuma pesan, intent, rute jawaban,
  dan waktu, tanpa data customer).
- Business insights: `GET /api/v1/insights` menghitung total dan
  stok menipis dari inventory dummy, DAN (sejak Fase 1) ikut
  menampilkan output Data Science di bagian `data_science` (lihat
  bagian Fase 1 di atas dan `API_CONTRACT.md`). Buat nempelin
  dashboard Streamlit ke dalam web app, itu masih kerjaan yang
  terbuka.

Hasil smoke test (sudah dijalankan lewat `npm run smoke`):
11/11 lolos di Fase 1: health, daftar produk, detail produk, produk
nggak dikenal 404, produk nggak valid 400, stok di bawah nol 400,
total insights, bagian data_science di insights (dummy), total DS di
insights cocok dengan output dummy, fallback kalau folder DS hilang
(tanpa crash), dan chat AI 200 atau 502 yang jelas.

## Frontend

```bash
cd frontend
npm install
npm run dev       # server dev Vite di port 5173, /api diproxy ke port 3001
npm run build     # build produksi
```

- Semua networking pakai Axios (`frontend/src/api.js`).
- Kalau backend-nya nggak lewat proxy Vite, atur `VITE_API_BASE_URL`
  di `.env`, kalau nggak, `/api` otomatis diproxy ke
  http://localhost:3001.
- Responsif: kartu produk numpuk di HP, 2 kolom di tablet, dan
  3 kolom di desktop (lihat `frontend/src/style.css`).
- Halaman ringkasan Fase 1: menampilkan total Data Science, unit per
  kanal, ringkasan stok menipis, dan metrik model baseline, semuanya
  dilabeli dummy.
- Keputusan desain (bukan sekadar template umum): header gelap
  dengan label "(Data Contoh)" yang kelihatan di tiap halaman, badge
  ketersediaan (tersedia / menipis / habis), kanal ditampilkan
  jelas-jelas sebagai label (bukan sinkronisasi), dan footer yang
  menyatakan batasan prototype dan data dummy di tiap halaman.

## Catatan deploy (free tier, buat versi final)

- GitHub Pages (gratis, domain github.io): frontend statis di
  https://kerb0y.github.io/authenkixx-fullstack/
  Caranya pakai branch `gh-pages` yang berisi hasil build frontend,
  karena akun integrasi GitHub yang dipakai Muse tidak diizinkan
  GitHub untuk push file workflow (`.github/workflows/`), jadi
  deploy otomatis lewat Actions tidak bisa dipasang dari sini.
  GitHub mengaktifkan Pages otomatis begitu branch `gh-pages`
  di-push (dikonfirmasi Ade pada 2026-10-25 tanpa mengubah setting
  Pages apa pun), jadi tidak perlu langkah manual di Settings.
  Build-nya pakai base `/authenkixx-fullstack/` supaya
  asetnya nggak 404.
  Penting dan jujur: GitHub Pages cuma hosting statis, jadi yang
  tampil di sana itu demo baca saja. Daftar produk, detail produk,
  dan ringkasan tampil dari data contoh yang dibundel di
  `frontend/public/demo-data.json` (katalog dummy yang sama dengan
  inventory backend). Update stok dan chat AI butuh backend, jadi di
  Pages itu nonaktif sampai backend di-deploy. Buat mengaktifkan
  Pages, di Settings repo pilih Pages lalu Source: GitHub Actions.
- Backend (rencana): Render (free tier).
- Database (produksi, rencana): Neon (free tier, Postgres).
- Backend, Gen AI, dan Data Science belum di-deploy, jadi checklist
  "bisa diakses online" baru terpenuhi sebagian lewat frontend
  statis ini.

## Kontrak API

Lihat `API_CONTRACT.md` di folder ini (kontrak yang sama juga ada
di repo gen-ai dan data-science). Endpoint, format request/response,
dan kode error sudah disepakati ketiga repo sebelum integrasi.

## Disclaimer

Lihat CHECKLIST_STATUS.md di repo ini. Fase 1 bukan versi final.
Target akhirnya adalah menyesuaikan dokumen use case Authenkixx dan
memenuhi semua checklist Main Quest buat Full-Stack, Gen AI, dan
Data Science. Fase 1 belum mengklaim sudah memenuhi semuanya.
