# Summarecon Ticketing — Admin Side

Dashboard internal untuk Event Ticketing & Venue Management System Summarecon. Next.js App Router + TypeScript + Tailwind v4, token visual dari [Style Guide – Summarecon Ticketing](./docs/style-guide.md).

Pasangan repo: [summarecon-ticketing-customer-side](https://github.com/RussellReece/summarecon-ticketing-customer-side).

## Jalankan

```bash
npm install
npm run dev      # http://localhost:3001 (customer side memakai 3000)
npm run build
npm run start
npx vitest run   # tes komponen klien
```

## Halaman

| Rute | Isi |
| --- | --- |
| `/` | Ringkasan: tiket terjual, pendapatan, check-in, refund, daftar event + saklar publikasi |
| `/events` | Daftar event, status, publikasi, progres penjualan |
| `/events/[id]` | Seat blocking (Book by Seat) atau kuota per kategori (Quota / Standing), kategori tiket, peserta |
| `/bookings` | Daftar order dengan status order dan status payment terpisah |
| `/orders/[id]` | Detail order, tiket per peserta, kartu e-ticket satu QR per order, riwayat scan |
| `/refunds` | Semua refund per status, termasuk refund akibat pembatalan event |
| `/refunds/[id]` | Data rekening, alur setujui → proses → selesai, template WhatsApp |
| `/checkin` | Pemindai QR, batas scan sesuai jumlah tiket valid |
| `/venues` | Master venue |
| `/users` | Akun dan role (Admin, Petugas check-in) |
| `/reports` | Laporan penjualan per event dan kategori |

## Struktur

```
src/app/(admin)/           layout + seluruh halaman dashboard
src/app/layout.tsx         root: font, metadata, tema gelap
src/components/ui/         Button, Badge, Card, KeyValue
src/components/shared/     Sidebar, Topbar, PageHead, ilustrasi kelopak
src/components/seat-map/   SeatBlocking
src/components/checkin/    QrScanner
src/components/refund/     RefundActions
src/lib/data/admin.ts      data contoh (venue, event, order, tiket, refund, scan, staff)
src/lib/utils.ts           label status, format rupiah, tone badge
src/types/admin.ts         tipe status sesuai dokumen analisis §8
src/__tests__/             tes vitest + jsdom
```

## Yang belum tersambung

- Semua data berasal dari `src/lib/data/admin.ts`; belum ada database, API, atau Server Action.
- Login hanya simulasi: tidak ada sesi, password, atau middleware per role.
- Seat blocking, saklar publikasi, dan aksi refund hanya mengubah state di browser.
- QR pada kartu e-ticket masih placeholder CSS, bukan QR asli.
- WhatsApp, payment gateway, dan antrean booking belum diimplementasikan.

Catatan: logo dan nama Summarecon milik pemiliknya; di prototipe ini dipakai sebagai konteks lokasi acara.
