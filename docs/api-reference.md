# API Reference — Summarecon Ticketing

| Lingkungan | Base URL |
|---|---|
| Produksi (admin) | `https://summarecon-admin.axtra.tech/api` |
| Produksi (petugas) | `https://summarecon-scan.axtra.tech/api` |
| Lokal | `http://localhost:3001/api` |

Dua jenis pemakai:

1. **Customer** — login, lihat order, ambil QR e-ticket.
2. **Petugas/admin** — scan QR, kelola refund, blokir kursi.

---

## 1. Aturan dasar

### Amplop respons

Sukses:

```json
{ "data": { } }
```

Gagal:

```json
{ "error": { "code": "KODE", "message": "Penjelasan", "details": { } } }
```

Daftar memakai `?page=1&perPage=25` (maks 100) dan mengembalikan:

```json
{ "data": { "meta": { "total": 4, "page": 1, "perPage": 25, "totalPages": 1 }, "items": [ ] } }
```

### Kode error

| HTTP | `error.code` | Arti |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Isi body tidak lolos validasi |
| 401 | `UNAUTHENTICATED` | Belum login / sesi berakhir |
| 401 | `INVALID_CREDENTIALS` | Email atau password salah |
| 401 | `SCAN_UNAUTHORIZED` | Kode akses petugas salah |
| 403 | `FORBIDDEN` | Role tidak berhak |
| 403 | `WRONG_PORTAL` | Akun customer dipakai di portal admin (atau sebaliknya) |
| 403 | `ACCOUNT_INACTIVE` | Akun dinonaktifkan |
| 404 | `NOT_FOUND` | Data tidak ada |
| 409 | `CONFLICT` | Bentrok state |
| 409 | `SEAT_UNAVAILABLE` | Kursi sudah diambil orang lain |
| 409 | `BATAS_SCAN` | Kuota scan QR sudah habis |
| 409 | `SCAN_BERSAMAAN` | Dua petugas memindai bersamaan, ulangi |
| 409 | `ORDER_BELUM_DIBAYAR` | QR belum boleh diterbitkan |
| 422 | `QR_TIDAK_DIKENAL` | Token tidak ada di database |
| 422 | `QR_TIDAK_SAH` | Tanda tangan token tidak cocok (QR palsu) |
| 422 | `EVENT_TIDAK_COCOK` | Tiket untuk event lain |
| 422 | `QR_DINONAKTIFKAN` | Tiket sudah direfund/dibatalkan |

### Tiga cara autentikasi

| Cara | Dipakai | Header / cookie |
|---|---|---|
| Cookie sesi | Web admin & customer | `summa_admin_session` / `summa_customer_session` |
| Bearer token | Klien non-browser | `Authorization: Bearer <token>` |
| Kode petugas | Perangkat pemindai | `x-scan-code: <SCAN_ACCESS_CODE>` |

---

## 2. QR e-ticket — cara kerjanya

Satu order = satu QR. QR boleh dipakai beberapa kali, sebanyak jumlah tiket valid dalam order itu.

### Bentuk token

```
TKT.<order_code>.<random>.<signature>
```

Contoh:

```
TKT.NEW-2026-0002.rDU49eyu9hHgxNB3DoDx-A.2gkMb_jNrhwdBLFuijFO-8LSs90zR16J
```

| Bagian | Isi |
|---|---|
| `TKT` | penanda format |
| `<order_code>` | kode order, mis. `NEW-2026-0002` |
| `<random>` | 16 byte acak base64url — berbeda tiap penerbitan |
| `<signature>` | HMAC-SHA256 dari `<order_code>.<random>` memakai `QR_SIGNING_SECRET` |

Ditandatangani supaya QR tidak bisa dipalsukan: orang yang tahu formatnya tetap tidak bisa membuat tanda tangan yang sah tanpa kunci server.

### Alur

```
customer bayar → order PAID
      ↓
GET /api/customer/orders/:id/qr      → token diterbitkan & disimpan (sekali)
      ↓
token dicetak jadi QR (data_url / PNG)
      ↓
petugas scan → POST /api/checkin/public
      ↓
verifikasi tanda tangan → cocokkan database → kunci tiket ke-1
      ↓
scan berikutnya → tiket ke-2, ke-3, ... sampai kuota habis
```

### Batas scan

Kuota = jumlah tiket dengan status `ISSUED` atau `USED`. Tiket `REFUNDED`/`CANCELLED` **mengurangi** kuota.

Contoh order 3 tiket, 1 direfund:

| Scan | Hasil |
|---|---|
| 1 | valid · tiket ke-1 · 1/2 |
| 2 | valid · tiket ke-2 · 2/2 |
| 3 | **409** `BATAS_SCAN` |

---

## 3. Auth

### `POST /api/auth/register`

Pendaftaran peserta. Role selalu `CUSTOMER`.

```json
{ "full_name": "Peserta Baru", "email": "peserta@mail.id", "phone_number": "0812...", "password": "Rahasia123!" }
```

`201` → user + `expires_at`, cookie `summa_customer_session` terpasang.
Password minimal 8 karakter. Email duplikat → `409 CONFLICT`.

### `POST /api/auth/login`

```json
{ "email": "nadia.demo@example.test", "password": "Summarecon2026!", "audience": "CUSTOMER" }
```

`audience`: `ADMIN` (admin & petugas) atau `CUSTOMER` (peserta).

| Kasus | Hasil |
|---|---|
| Berhasil | `200` + cookie + `expires_at` |
| Password salah | `401 INVALID_CREDENTIALS` |
| Customer ke portal admin | `403 WRONG_PORTAL` |
| Akun nonaktif | `403 ACCOUNT_INACTIVE` |

Masa sesi: admin 12 jam, customer 7 hari. Token asli hanya ada di cookie; database menyimpan hash SHA-256.

### `POST /api/auth/logout`

Mencabut sesi di server lalu mengosongkan cookie.

### `GET /api/auth/me`

```json
{ "data": { "user_id": "USR-CUS-001", "name": "Nadia Putri", "role": "CUSTOMER", "audience": "CUSTOMER", "session_id": "SES-..." } }
```

---

## 4. Customer — order & QR

### `GET /api/customer/orders`

Butuh login customer. Hanya mengembalikan order milik sendiri.

```json
{
  "data": [
    {
      "order_id": "ORD-NEW-2",
      "order_code": "NEW-2026-0002",
      "event": { "id": "EVT-ATR-001", "name": "Bandung Tech & Creative Expo", "start_at": "2026-12-20T03:00:00.000Z" },
      "order_status": "PAID",
      "ticket_count": 2,
      "total_amount": 1000000,
      "created_at": "2026-11-07T09:20:00.000Z",
      "e_ticket": {
        "e_ticket_id": "ETK-...",
        "valid_ticket_count": 2,
        "successful_scan_count": 0,
        "remaining": 2,
        "status_summary": "UNUSED"
      }
    }
  ]
}
```

### `GET /api/customer/orders/:id/qr`

Menerbitkan QR kalau belum ada, atau mengambil yang sudah ada. **QR tidak pernah berubah** setelah terbit — menambah scan hanya mengubah hitungan.

Kode akses: butuh login customer; order harus milik sendiri (`404` kalau bukan).

Syarat: `order_status` harus `PAID` atau mengandung `REFUND`. Selain itu → `409 ORDER_BELUM_DIBAYAR`.

**JSON (default)**

```json
{
  "data": {
    "order_id": "ORD-NEW-2",
    "order_code": "NEW-2026-0002",
    "event_name": "Bandung Tech & Creative Expo",
    "event_start_at": "2026-12-20T03:00:00.000Z",
    "token": "TKT.NEW-2026-0002.rDU49eyu9hHgxNB3DoDx-A.2gkMb_jNrhwdBLFuijFO-8LSs90zR16J",
    "valid_ticket_count": 2,
    "successful_scan_count": 0,
    "remaining": 2,
    "exhausted": false,
    "participants": [
      { "ticket_id": "TKT-NEW-1", "name": "Nadia Putri", "status": "ISSUED" },
      { "ticket_id": "TKT-NEW-2", "name": "Rekan Nadia", "status": "ISSUED" }
    ],
    "data_url": "data:image/png;base64,..."
  }
}
```

`data_url` siap dipasang langsung ke `<img src>` — tidak perlu library QR di sisi klien.

**PNG**

```
GET /api/customer/orders/ORD-NEW-2/qr?format=png
```

→ `Content-Type: image/png`, 720×720, cocok untuk cetak atau lampiran WhatsApp.

---

## 5. Check-in (petugas)

### `GET /api/checkin/public`

Daftar event yang bisa dipindai. Header `x-scan-code` wajib.

```json
{ "data": [ { "event_id": "EVT-ATR-001", "event_name": "Bandung Tech & Creative Expo", "start_at": "..." } ] }
```

### `POST /api/checkin/public`

Memindai QR. Header `x-scan-code` wajib, **tidak butuh login admin**.

```json
{ "qr_token_hash": "TKT.NEW-2026-0002.rDU49...", "event_id": "EVT-ATR-001", "device_id": "GATE-A-1" }
```

**Berhasil**

```json
{
  "data": {
    "result": "VALID",
    "checkin_id": "CHK-...",
    "ticket": { "ticket_id": "TKT-NEW-1", "participant_name": "Nadia Putri" },
    "scan": "1/2",
    "remaining": 1,
    "event_name": "Bandung Tech & Creative Expo"
  }
}
```

**Kuota habis**

```json
{ "error": { "code": "BATAS_SCAN", "message": "Sudah digunakan: 2/2", "details": { "scan": "2/2" } } }
```

Yang dijaga server:

- Tanda tangan token diverifikasi → `422 QR_TIDAK_SAH` kalau dipalsukan
- Dua petugas memindai bersamaan → satu `200`, satu `409 SCAN_BERSAMAAN`
- Scan atomik: `successfulScanCount` hanya naik kalau nilainya belum berubah
- Setiap scan sukses menulis satu `checkin_records`

### `POST /api/checkin` (versi admin)

Sama persis, tapi memakai sesi admin, bukan `x-scan-code`. Dipakai halaman `/checkin` di dashboard.

---

## 6. Event, kursi, booking

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/events` | publik | Filter `status`, `venue_id`, `q` |
| GET | `/api/events/:id` | publik | Detail + section + kategori + hitungan kursi |
| GET | `/api/events/:id/seats` | publik | Denah kursi, filter `status`, `section_id` |
| POST | `/api/events/:id/holds` | customer | Kunci kursi 10 menit, atomik |
| GET | `/api/events/:id/holds` | admin | Hold aktif |
| POST | `/api/events/:id/seats/block` | admin | Blokir kursi operasional |
| DELETE | `/api/events/:id/seats/block?seat_id=` | admin | Lepas blokir |
| GET | `/api/bookings` | publik | Daftar order |
| GET | `/api/bookings/:id` | publik | Detail order lengkap |
| POST | `/api/payments/callback` | signature | Idempoten lewat `provider_event_id` |

Contoh kunci kursi:

```json
POST /api/events/EVT-ATR-001/holds
{ "user_id": "USR-CUS-001", "event_seat_ids": ["ATR-A-01", "ATR-A-02"] }
```

Kalau satu kursi gagal, **semua dibatalkan** (`409 SEAT_UNAVAILABLE` + `details.taken`).

---

## 7. Refund

| Method | Path | Akses |
|---|---|---|
| GET | `/api/refunds` | publik (filter `status`, `event_id`) |
| GET | `/api/refunds/:id` | publik |
| PATCH | `/api/refunds/:id/status` | admin |

Transisi yang diizinkan:

```
REQUESTED          -> NEED_CONFIRMATION | UNDER_REVIEW | APPROVED
NEED_CONFIRMATION  -> UNDER_REVIEW | APPROVED | REJECTED
UNDER_REVIEW       -> APPROVED | REJECTED | NEED_CONFIRMATION
APPROVED           -> PROCESSING | REJECTED
PROCESSING         -> COMPLETED
```

`COMPLETED` menonaktifkan tiket terkait dan mengurangi kuota scan otomatis.

---

## 8. Lain-lain

| Method | Path | Akses | Isi |
|---|---|---|---|
| GET | `/api/dashboard` | publik | Ringkasan angka |
| GET | `/api/reports/sales` | publik | Penjualan per kategori |
| GET | `/api/venues` | publik | Venue + layout |
| GET | `/api/users` | publik | Akun + role |
| GET | `/api/settings` | publik | Aturan sistem (40 baris) |

---

## 9. Contoh alur lengkap

```bash
CUST=https://summarecon-admin.axtra.tech/api
SCAN=https://summarecon-scan.axtra.tech/api

# 1. Customer login
curl -c jar.txt -X POST $CUST/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"nadia.demo@example.test","password":"Summarecon2026!","audience":"CUSTOMER"}'

# 2. Lihat order
curl -b jar.txt $CUST/customer/orders

# 3. Ambil QR (JSON + data_url)
curl -b jar.txt $CUST/customer/orders/ORD-NEW-2/qr

# 4. Unduh QR sebagai PNG
curl -b jar.txt "$CUST/customer/orders/ORD-NEW-2/qr?format=png" -o tiket.png

# 5. Petugas memindai (tanpa login admin)
curl -X POST $SCAN/checkin/public \
  -H 'Content-Type: application/json' \
  -H 'x-scan-code: SCAN-2026' \
  -d '{"qr_token_hash":"TKT.NEW-2026-0002.<random>.<sig>","event_id":"EVT-ATR-001"}'

# 6. Scan lagi sampai kuota habis, lalu ditolak
```

---

## 10. Konfigurasi server

| Env | Wajib | Isi |
|---|---|---|
| `DATABASE_URL` | ya | `file:./dev.db` (SQLite) atau URL Postgres |
| `QR_SIGNING_SECRET` | ya | Kunci HMAC token QR, minimal 16 karakter |
| `SCAN_ACCESS_CODE` | ya (untuk /scan) | Kode akses perangkat petugas |

Mengganti `QR_SIGNING_SECRET` membuat **semua QR yang sudah dicetak tidak sah**. Ganti hanya kalau memang ingin membatalkan semuanya.

---

## 10b. Postman

Collection siap import: [`docs/postman/Summarecon-QR.postman_collection.json`](./postman/Summarecon-QR.postman_collection.json)
Panduan langkah demi langkah: [`docs/postman-qr-guide.md`](./postman-qr-guide.md)

Import → Run collection. Sudah diuji: 6 request, 13 assertion, 0 gagal.

Alur di dalamnya: login customer → daftar order → ambil QR (JSON & PNG) → scan sebagai petugas → uji token palsu (harus 422).

---

## 11. Akun demo

Password semua: `Summarecon2026!`

| Email | Role | Portal |
|---|---|---|
| `admin.demo@example.test` | ADMIN | admin |
| `checkin.demo@example.test` | CHECK_IN_STAFF | admin (menu terbatas) |
| `nadia.demo@example.test` | CUSTOMER | customer |
| `rafi.demo@example.test` | CUSTOMER | customer |
| `dina.demo@example.test` | CUSTOMER | customer |
| `bima.demo@example.test` | CUSTOMER | customer |

---

## 12. Yang belum ada

- Endpoint tulis untuk membuat order dari customer (`order baru` masih lewat seed/admin).
- Auth di endpoint baca publik (`/api/bookings`, `/api/refunds`, `/api/users` masih terbuka).
- Rate limit pada `/api/checkin/public`.
- Rotasi kode petugas per orang (sekarang satu kode bersama).
