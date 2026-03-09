# Iftar Relay

Platform hiper-lokal untuk mengubah porsi buka puasa yang hampir tersisa menjadi bantuan makan yang cepat, terarah, dan bermartabat.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- MariaDB / MySQL dari XAMPP
- `mysql2` untuk koneksi database
- Integrasi invoice dan webhook Mayar.id

## Fitur Utama

- Landing page berbahasa Indonesia dengan sponsor flow langsung
- Login demo untuk `admin`, `merchant`, dan `operator`
- Dashboard web untuk ringkasan metrik, transaksi, voucher, dan distribusi
- Modul backoffice untuk merchant/node dan direktori donatur
- Interface mobile-first untuk input porsi, scan QR kamera, verifikasi voucher, update tugas, dan upload bukti lapangan
- Voucher digital publik di `/voucher/[code]`
- Checkout sponsor di `/checkout/[transactionId]`
- Penyimpanan penuh di MariaDB XAMPP dengan seed data otomatis
- Pemakaian asset gambar nyata dari `public/images/`
- Modul laporan dampak dan ekspor CSV operasional

## Database XAMPP

Aplikasi sekarang tidak lagi memakai file store sebagai persistence utama. Data dibaca dan ditulis ke database MariaDB XAMPP.

Environment default:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=iftar_relay
```

Script database:

```bash
npm run db:setup
npm run db:reset
```

`db:setup` akan:

- membuat database `iftar_relay` bila belum ada
- membuat schema tabel
- mengisi seed data awal bila tabel masih kosong

## Integrasi Mayar.id

Integrasi pembayaran sekarang mendukung mode langsung ke API Mayar resmi bila `MAYAR_API_KEY` tersedia.

Environment yang relevan:

```env
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
MAYAR_API_BASE_URL=https://api.mayar.id/hl/v1
MAYAR_CHECKOUT_BASE_URL=https://checkout.mayar.id
MAYAR_API_KEY=
MAYAR_WEBHOOK_URL=http://localhost:3000/api/mayar/webhook
MAYAR_WEBHOOK_SECRET=
MAYAR_WEBHOOK_TOKEN=
```

Alur yang tersedia:

- `POST /api/transactions`
  - membuat invoice sponsor ke Mayar
- `POST /api/transactions/[transactionId]/sync`
  - sinkron manual status invoice dari Mayar
- `POST /api/mayar/webhook`
  - menerima webhook pembayaran dan mengaktifkan voucher
- `POST /api/transactions/[transactionId]/pay`
  - fallback simulasi lokal saat API key belum dipasang

Jika `MAYAR_API_KEY` belum diisi, aplikasi tetap berjalan dengan fallback mock agar demo lokal tidak terblokir.

Catatan:

- endpoint create invoice dan detail invoice sudah diverifikasi live dengan API key Mayar
- route webhook mendukung token verifikasi dari Mayar dan secret internal opsional untuk pengujian manual
- file MCP Mayar ditulis ke `C:\Users\fikri\.codex\config.toml`
- MCP Mayar sekarang dikonfigurasi sesuai dokumentasi resmi lewat `mcp-remote` dengan header `Authorization:${API_KEY}`
- karena endpoint upstream bersifat SSE, config lokal tetap menambahkan `--transport sse-only`
- endpoint upstream MCP tetap `https://mcp.mayar.id/sse`
- env yang dipakai untuk child process MCP adalah `API_KEY`
- sesi Codex saat ini perlu direstart agar server MCP `mayar` terbaca oleh tool layer
- callback webhook live tetap membutuhkan URL publik, bukan `localhost`

## Akun Demo

- Admin
  - `admin@iftarrelay.id`
  - `ramadan123`
- Merchant
  - `merchant@iftarrelay.id`
  - `ramadan123`
- Operator
  - `operator@iftarrelay.id`
  - `ramadan123`

## Menjalankan

```bash
npm install
npm run db:setup
npm run dev
```

Buka `http://localhost:3000`.

## Rute Penting

- `/` landing page dan sponsor flow
- `/login` autentikasi demo
- `/dashboard` dashboard web
- `/dashboard/transactions` modul transaksi dan pembayaran
- `/dashboard/network` manajemen merchant dan node distribusi
- `/dashboard/donors` direktori donatur dan histori sponsorship
- `/dashboard/reports` laporan dampak, alert operasional, dan export CSV
- `/dashboard/vouchers` modul voucher digital
- `/dashboard/distribution` monitoring distribusi dan bukti lapangan
- `/mobile` interface operasional mobile-first

## Verifikasi

- `npm run db:setup`
- `npm run lint`
- `npm run build`
