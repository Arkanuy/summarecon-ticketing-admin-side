# API Reference — Summarecon Ticketing

Base URL produksi: `https://summarecon-admin.axtra.tech/api`
Base URL lokal: `http://localhost:3001/api`

Autentikasi memakai cookie sesi (HttpOnly) atau header `Authorization: Bearer <token>` untuk klien non-browser.

---

## Amplop respons

Sukses:

```json
{ "data": { ... } }
```

Gagal:

```json
{ "error": { "code": "KODE", "message": "Penjelasan", "details": { } } }
```

| Kode HTTP | `error.code` | Arti |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body tidak lolos validasi; `details` berisi field yang salah |
| 400 | `SIGNATURE_INVALID` | Signature callback pembayaran tidak sah |
| 401 | `UNAUTHENTICATED` | Belum login atau sesi kedaluwarsa |
| 401 | `INVALID_CREDENTIALS` | Email atau password salah |
| 403 | `FORBIDDEN` | Role tidak berhak |
| 403 | `WRONG_PORTAL` | Akun customer dipakai di portal admin (atau sebaliknya) |
| 403 | `ACCOUNT_INACTIVE` | Akun dinonaktifkan |
| 404 | `NOT_FOUND` | Data tidak ada |
| 409 | `CONFLICT` | Bentrok state (kursi terambil, email terdaftar, transisi refund tidak sah) |
| 422 | `QR_TIDAK_DIKENAL` / `EVENT_TIDAK_COCOK` / `QR_DINONAKTIFKAN` | QR tidak bisa dipakai |
| 409 | `BATAS_SCAN` | Kuota scan QR order sudah habis |

Daftar memakai `?page=1&perPage=25` (maks 100) dan mengembalikan:

```json
{ "data": { "meta": { "total": 4, "page": 1, "perPage": 25, "totalPages": 1 }, "items": [ ] } }
```

---

## Auth

### POST /api/auth/register

Pendaftaran peserta. Role yang dibuat selalu `CUSTOMER`.

```json
{
  "full_name": "Peserta Baru",
  "email": "peserta@mail.id",
  "phone_number": "081234567890",
  "password": "Rahasia123!"
}
```

Aturan: `full_name` 2–80 karakter, `password` minimal 8 karakter, email unik.
Respons `201` berisi user dan `expires_at`; cookie `summa_customer_session` langsung dipasang.

| Kasus | Hasil |
|---|---|
| Email sudah dipakai | 409 `CONFLICT`, `details.field = "email"` |
| Password < 8 | 400 `VALIDATION_ERROR`, `details.fieldErrors.password` |

### POST /api/auth/login

```json
{ "email": "admin.demo@example.test", "password": "Summarecon2026!", "audience": "ADMIN" }
```

`audience`: `ADMIN` (admin & petugas check-in) atau `CUSTOMER` (peserta).

| Kasus | Hasil |
|---|---|
| Berhasil | 200, cookie `summa_admin_session` / `summa_customer_session`, `expires_at` |
| Password salah | 401 `INVALID_CREDENTIALS` |
| Customer login ke portal admin | 403 `WRONG_PORTAL` |
| Akun nonaktif | 403 `ACCOUNT_INACTIVE` |

Sesi: admin 12 jam, customer 7 hari. Token asli hanya ada di cookie; database menyimpan hash SHA-256.

### POST /api/auth/logout

Mencabut sesi di server (bukan hanya menghapus cookie) lalu mengosongkan cookie. Balasan `{ "data": { "logged_out": true } }`.

### GET /api/auth/me

Mengembalikan user yang sedang login.

```json
{ "data": { "user_id": "USR-ADM-001", "name": "Admin Demo", "email": "admin.demo@example.test", "role": "ADMIN", "audience": "ADMIN", "session_id": "SES-..." } }
```

Tanpa sesi: 401 `UNAUTHENTICATED`.

---

## Dashboard & laporan

### GET /api/dashboard

Ringkasan admin. Semua angka dihitung dari database.

```json
{
  "data": {
    "events_total": 3,
    "events_public": 1,
    "tickets_sold": 4,
    "capacity": 677,
    "occupancy_percent": 1,
    "revenue": 1000000,
    "orders_paid": 2,
    "checkins": 1,
    "refunds_open": 2,
    "per_event": [ { "event_id": "EVT-DWT-001", "event_name": "...", "status": "COMPLETED", "sold": 2, "capacity": 345 } ]
  }
}
```

### GET /api/reports/sales?event_id=

Penjualan per kategori tiket.

```json
{ "data": { "total_revenue": 3050000, "items": [ { "event_id": "...", "category": "Standing A - General Front", "price": 150000, "quota": 100, "sold": 2, "remaining": 98, "revenue": 300000 } ] } }
```

---

## Event

### GET /api/events

Filter: `status`, `venue_id`, `q`, `page`, `perPage`.

```json
{ "data": { "meta": { "total": 3 }, "items": [ {
  "event_id": "EVT-ATR-001", "event_code": "EVT-2026-ATR-001",
  "event_name": "Bandung Tech & Creative Expo", "event_status": "SALES_OPEN",
  "venue": { "id": "VEN-ATR-001", "name": "Atrium Cibadak" },
  "start_at": "...", "capacity": 80, "sold": 2,
  "categories": [ { "id": "CAT-ATR-A", "name": "Front Row", "price": 500000, "quota": 24 } ]
} ] } }
```

### GET /api/events/:id

Detail lengkap: venue, layout template (booking types + elemen), section, kategori, hitungan status kursi, catatan pembatalan.

### GET /api/events/:id/seats

Denah kursi (`BOOK_BY_SEAT`). Filter: `status`, `section_id`.

```json
[ { "event_seat_id": "ATR-A-01", "row_label": "A", "seat_number": "01", "seat_label": "A01",
    "position": { "x": 28, "y": 30, "unit": "normalized_percent" }, "status": "AVAILABLE" } ]
```

### POST /api/events/:id/holds — butuh login (customer)

Kunci kursi 10 menit. Atomik: kalau satu kursi gagal, semuanya batal.

```json
{ "user_id": "USR-CUS-001", "event_seat_ids": ["ATR-A-01", "ATR-A-02"] }
```

| Kasus | Hasil |
|---|---|
| Berhasil | 201, `{ hold_id, event_seat_ids, reserved_until }` |
| Ada kursi terambil | 409 `SEAT_UNAVAILABLE`, `details.taken` berisi kursi yang gagal |
| Balapan dua permintaan | 409 `SEAT_RACE` |

Kursi berubah `AVAILABLE → LOCKED`, `reserved_quantity` section ikut naik.

### GET /api/events/:id/holds — butuh admin

Daftar hold berstatus `ACTIVE` untuk event.

### POST /api/events/:id/seats/block — butuh admin

```json
{ "event_seat_ids": ["ATR-A-07"], "reason": "kamera", "blocked_by": "USR-ADM-001" }
```

Kursi terjual atau sedang ditahan tidak bisa diblokir — permintaan campur ditolak 409 seluruhnya (§6.2 no.14–16).

### DELETE /api/events/:id/seats/block?seat_id=ATR-A-07 — butuh admin

Melepas blokir; kursi kembali `AVAILABLE`.

---

## Booking

### GET /api/bookings

Filter: `status`, `event_id`, `q`, `page`, `perPage`.

```json
{ "order_id": "ORD-ATR-001", "order_code": "ATR-2026-0001",
  "buyer": { "name": "Rafi Pratama", "email": "rafi.demo@example.test" },
  "order_status": "PAID", "payment_status": "SUCCESS", "quantity": 1,
  "total_amount": 500000, "ticket_count": 2 }
```

### GET /api/bookings/:id

Order lengkap: item, payment (+ riwayat callback), tiket per peserta, e-ticket (hitungan scan), refund terkait.

---

## Check-in

### POST /api/checkin — butuh admin/petugas

```json
{ "qr_token_hash": "DUMMY_HASH_QR_ATR_001", "event_id": "EVT-ATR-001", "officer_user_id": "USR-CHK-001" }
```

Aturan §8.6: satu QR per order, diterima selama jumlah scan < tiket valid (status `ISSUED` atau `USED`; `REFUNDED`/`CANCELLED` mengurangi kuota).

| Kasus | Hasil |
|---|---|
| Scan diterima | 200 `{ "result": "VALID", "scan": "1/2", "ticket": { } }` |
| Kuota habis | 409 `BATAS_SCAN`, `details.scan` |
| QR tidak dikenal | 422 `QR_TIDAK_DIKENAL` |
| Event tidak cocok | 422 `EVENT_TIDAK_COCOK` |
| QR sudah dinonaktifkan | 422 `QR_DINONAKTIFKAN` |
| Dua petugas bersamaan | satu 200, satu 409 `SCAN_BERSAMAAN` |

### GET /api/checkin?event_id=

100 riwayat scan terakhir.

---

## Refund

### GET /api/refunds

Filter: `status`, `event_id`, `page`, `perPage`.

### GET /api/refunds/:id

Detail + timeline + riwayat status + aksi admin.

### PATCH /api/refunds/:id/status — butuh admin

```json
{
  "to_status": "APPROVED",
  "actor_user_id": "USR-ADM-001",
  "reason": "Data lengkap",
  "destination": { "method": "BANK_TRANSFER", "provider_name": "BCA", "account_number": "000123", "account_holder_name": "Rafi" },
  "manual_transfer": { "processed_by": "USR-ADM-001", "transfer_reference": "TRX-001" }
}
```

Transisi yang diizinkan:

```
REQUESTED          -> NEED_CONFIRMATION | UNDER_REVIEW | APPROVED
NEED_CONFIRMATION  -> UNDER_REVIEW | APPROVED | REJECTED
UNDER_REVIEW       -> APPROVED | REJECTED | NEED_CONFIRMATION
APPROVED           -> PROCESSING | REJECTED
PROCESSING         -> COMPLETED
```

`REQUESTED → APPROVED` khusus refund pembatalan event (tanpa persetujuan peserta, §8.5).
Saat `COMPLETED`, tiket terkait jadi `REFUNDED` dan kolom `invalidated_at` diisi.

Transisi tidak sah: 409 `CONFLICT` dengan `details.allowed` berisi langkah yang benar.

---

## Payment

### POST /api/payments/callback

Callback gateway sandbox. Idempoten lewat `provider_event_id` unik.

```json
{ "payment_id": "PAY-ATR-001", "provider_event_id": "SBX-CB-001", "event_type": "PAYMENT_SUCCESS", "signature": "valid" }
```

| Kasus | Hasil |
|---|---|
| Pertama kali | 200 `{ "status": "PROCESSED" }`, order `PAID`, tiket `ISSUED`, e-ticket dibuat |
| Dikirim ulang | 200 `{ "status": "DUPLICATE_IGNORED" }` |
| Signature tidak `valid` | 400 `SIGNATURE_INVALID`, tetap dicatat sebagai `REJECTED_SIGNATURE` |

`event_type`: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`.

---

## Master data

### GET /api/venues

Venue + layout template + jumlah event.

### GET /api/users — butuh admin

Akun internal beserta role.

### GET /api/settings

Aturan sistem: `booking.seat_lock_duration_minutes` (10), `payment.pending_timeout_minutes` (7), refund H-1, reminder H-3/H-1, dan lainnya (40 baris).

---

## Matriks akses

| Endpoint | Tanpa login | Customer | Admin | Petugas check-in |
|---|---|---|---|---|
| GET events, seats, venues, settings, dashboard, reports | ✅ | ✅ | ✅ | ✅ |
| GET bookings, refunds, users | ✅ | ✅ | ✅ | ✅ |
| POST auth/register, auth/login | ✅ | ✅ | ✅ | ✅ |
| POST events/:id/holds | ❌ 401 | ✅ | ❌ 403 | ❌ 403 |
| GET events/:id/holds | ❌ 401 | ❌ 403 | ✅ | ✅ |
| POST/DELETE seats/block | ❌ 401 | ❌ 403 | ✅ | ✅ |
| POST checkin | ❌ 401 | ❌ 403 | ✅ | ✅ |
| PATCH refunds/:id/status | ❌ 401 | ❌ 403 | ✅ | ✅ |
| POST payments/callback | ✅ (signature) | — | — | — |

Catatan: endpoint baca sengaja masih terbuka untuk prototipe. Sebelum dipakai publik, tambahkan guard yang sama dengan endpoint tulis.

---

## Contoh alur lengkap (curl)

```bash
BASE=https://summarecon-admin.axtra.tech/api

# 1. Login admin, simpan cookie
curl -c jar.txt -X POST $BASE/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin.demo@example.test","password":"Summarecon2026!","audience":"ADMIN"}'

# 2. Lihat dashboard
curl -b jar.txt $BASE/dashboard

# 3. Blokir satu kursi
curl -b jar.txt -X POST $BASE/events/EVT-ATR-001/seats/block \
  -H 'Content-Type: application/json' \
  -d '{"event_seat_ids":["ATR-A-07"],"reason":"kamera"}'

# 4. Setujui refund
curl -b jar.txt -X PATCH $BASE/refunds/RFD-ATR-001/status \
  -H 'Content-Type: application/json' \
  -d '{"to_status":"APPROVED","actor_user_id":"USR-ADM-001"}'

# 5. Scan QR
curl -b jar.txt -X POST $BASE/checkin \
  -H 'Content-Type: application/json' \
  -d '{"qr_token_hash":"DUMMY_HASH_QR_ATR_001","event_id":"EVT-ATR-001"}'

# 6. Logout
curl -b jar.txt -c jar.txt -X POST $BASE/auth/logout
```

---

## Akun demo

Password semua akun: `Summarecon2026!` (bisa diubah lewat `SEED_PASSWORD` saat seeding).

| Email | Role | Portal |
|---|---|---|
| admin.demo@example.test | ADMIN | admin |
| checkin.demo@example.test | CHECK_IN_STAFF | admin (menu terbatas) |
| nadia.demo@example.test | CUSTOMER | customer |
| rafi.demo@example.test | CUSTOMER | customer |
| dina.demo@example.test | CUSTOMER | customer |
| bima.demo@example.test | CUSTOMER | customer |
