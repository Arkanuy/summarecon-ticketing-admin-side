# Database & API — Summarecon Ticketing (Admin Side)

Database SQLite lewat Prisma, diisi dari `event_ticketing_venue_management_dummy_data.json`. Semua angka di API dihitung dari database, bukan dari data statis di komponen.

## Kenapa SQLite

Skema ditulis netral supaya bisa naik ke Postgres tanpa mengubah model: cukup ganti `provider` di `prisma/schema.prisma` dan `DATABASE_URL`.

Pindah ke Postgres saat butuh:

```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Yang hilang di SQLite dan perlu diganti saat naik ke Postgres:

- `JSON.stringify` di kolom teks jadi tipe `Json` asli
- Locking baris pakai `SELECT ... FOR UPDATE` (SQLite memakai `updateMany` dengan guard status)
- Pencarian teks `contains` jadi `ILIKE` / `pg_trgm`

## Struktur

```
prisma/schema.prisma   31 tabel, relasi mengikuti kunci di JSON dummy
prisma/seed.mjs        seeder: baca JSON -> normalisasi -> isi tabel
prisma/dev.db          database SQLite hasil migrasi + seed
src/lib/db.ts          PrismaClient tunggal
src/lib/api.ts         amplop respons, paging, parsing JSON kolom teks
src/app/api/**         route handler
```

Perintah:

```bash
npm run db:migrate     # buat/ubah tabel
npm run db:seed        # isi ulang dari JSON dummy
npm run db:reset       # hapus + migrasi + seed
npm run db:studio      # buka Prisma Studio
```

Seed idempoten: setiap kali dijalankan, semua tabel dikosongkan dulu lalu diisi ulang, jadi aman untuk pengujian.

## Normalisasi dari JSON

JSON dummy menyimpan beberapa hal sebagai array/objek di dalam satu kolom. Yang dipecah jadi tabel:

| Di JSON | Jadi tabel |
|---|---|
| `role_permissions[].permission_ids` | `role_permissions` satu baris per pasangan |
| `refunds[].ticket_ids` | `refund_lines` (per tiket, mendukung refund parsial) |
| `refunds[].refund_destination` | kolom `dest_*` di `refunds` agar bisa diverifikasi admin |
| `refunds[].manual_transfer` | kolom `manual_*` di `refunds` |
| `system_settings` (objek bersarang) | `system_settings` key-value, 40 baris |

Yang tetap JSON di kolom teks karena hanya dibaca utuh: `layout_elements`, `snapshot_payload`, `buyer_snapshot`, `position`, `master_layout_elements`.

Dua perbaikan saat seeding:

1. `event_seats.section_id` di JSON memakai ID master (`SEC-ATR-A`) padahal FK sebenarnya `event_section_id` (`EVS-ATR-A`); seeder memetakan lewat pasangan event + section.
2. `refunds.target_completion_clock_start` berisi aturan (`WHEN_REFUND_DESTINATION_DATA_IS_COMPLETE`), bukan tanggal; kolomnya `TEXT`.

## API

Semua respons memakai amplop:

```json
{ "data": ... }
{ "error": { "code": "...", "message": "...", "details": ... } }
```

Daftar memakai `?page=&perPage=` (maks 100) dan mengembalikan `meta`.

### Baca

| Method | Path | Isi |
|---|---|---|
| GET | `/api/dashboard` | Tiket terjual, pendapatan, check-in, refund terbuka, ringkasan per event |
| GET | `/api/events` | Daftar event, filter `status`, `venue_id`, `q` |
| GET | `/api/events/:id` | Detail event, section, kategori, hitungan status kursi |
| GET | `/api/events/:id/seats` | Denah kursi, filter `status`, `section_id` |
| GET | `/api/bookings` | Order, filter `status`, `event_id`, `q` |
| GET | `/api/bookings/:id` | Order lengkap: item, payment, tiket, QR, refund |
| GET | `/api/refunds` | Refund, filter `status`, `event_id` |
| GET | `/api/refunds/:id` | Detail + riwayat status + aksi admin |
| GET | `/api/checkin?event_id=` | Riwayat scan (100 terakhir) |
| GET | `/api/venues` | Venue + layout template |
| GET | `/api/users` | Akun internal + role |
| GET | `/api/reports/sales` | Penjualan per kategori, filter `event_id` |
| GET | `/api/settings` | Aturan sistem (hold 10 menit, pending 7 menit, refund H-1) |

### Tulis

| Method | Path | Body | Aturan yang dijaga |
|---|---|---|---|
| POST | `/api/events/:id/holds` | `user_id`, `event_seat_ids[]` | Kursi dikunci atomik; kalau satu gagal, semua batal (409 `SEAT_UNAVAILABLE`) |
| POST | `/api/events/:id/seats/block` | `event_seat_ids[]`, `reason`, `blocked_by` | Kursi terjual/ditahan tidak bisa diblokir (§6.2 no.14–16) |
| DELETE | `/api/events/:id/seats/block?seat_id=` | — | Lepas blokir, kursi kembali AVAILABLE |
| POST | `/api/checkin` | `qr_token_hash`, `event_id`, `officer_user_id` | Scan diterima selama < tiket valid; balapan antar petugas ditolak (§8.6) |
| PATCH | `/api/refunds/:id/status` | `to_status`, `actor_user_id`, `reason`, `destination`, `manual_transfer` | Transisi dibatasi; `COMPLETED` menonaktifkan tiket |
| POST | `/api/payments/callback` | `payment_id`, `provider_event_id`, `event_type`, `signature` | Idempoten lewat unique `provider_event_id`; signature wajib `valid` di sandbox |

### Transisi refund yang diizinkan

```
REQUESTED          -> NEED_CONFIRMATION | UNDER_REVIEW | APPROVED
NEED_CONFIRMATION  -> UNDER_REVIEW | APPROVED | REJECTED
UNDER_REVIEW       -> APPROVED | REJECTED | NEED_CONFIRMATION
APPROVED           -> PROCESSING | REJECTED
PROCESSING         -> COMPLETED
```

Alasan `REQUESTED → APPROVED` diizinkan: refund akibat pembatalan event tidak lewat persetujuan peserta (dokumen §8.5). Turunnya tetap tercatat di `refund_status_histories`.

## Hasil uji manual (curl)

| Skenario | Hasil |
|---|---|
| Kunci 2 kursi | 201, kedua kursi `LOCKED` |
| Kunci kursi yang sama lagi | 409 `SEAT_UNAVAILABLE` |
| Kunci campuran (1 bebas + 1 terkunci) | 409, kursi bebas **tidak** ikut terkunci (rollback) |
| Scan tiket 2 kuota: scan 1, 2 | 200, `1/2` lalu `2/2` |
| Scan ke-3 | 409 `BATAS_SCAN` |
| QR tak dikenal | 422 `QR_TIDAK_DIKENAL` |
| Event tidak cocok | 422 `EVENT_TIDAK_COCOK` |
| Callback dikirim dua kali | kedua 200, yang kedua `DUPLICATE_IGNORED` |
| Callback signature salah | 400 `SIGNATURE_INVALID` |
| Refund lompat UNDER_REVIEW → COMPLETED | 409, menyebut transisi yang sah |
| Refund sah sampai COMPLETED | tiket jadi `REFUNDED`, 4 baris riwayat tercatat |

## Yang belum dikerjakan

- Autentikasi & otorisasi API: belum ada pengecekan sesi/role, jadi endpoint tulis masih terbuka.
- Pelepasan hold kedaluwarsa: data lama sudah ada statusnya, tapi belum ada worker yang otomatis melepas setelah 10 menit.
- Antrean FIFO: tabel `queue_entries` ada isinya, endpoint antrean belum dibuat.
- Endpoint tulis untuk event, kategori, dan venue: baru baca saja.
- Nomor rekening disimpan apa adanya seperti data dummy; untuk produksi perlu enkripsi kolom dan pembatasan akses.
