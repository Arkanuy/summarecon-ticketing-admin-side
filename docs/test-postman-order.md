# Test di Postman — endpoint & payload siap tempel

Base URL: `https://summarecon-admin.axtra.tech`

Semua request butuh cookie peserta (kecuali yang ditandai admin).
Di Postman: jalankan **Login peserta** dulu, cookie tersimpan otomatis.

---

## 1. Login peserta

```
POST https://summarecon-admin.axtra.tech/api/auth/login
Content-Type: application/json
```

```json
{
  "email": "nadia.demo@example.test",
  "password": "Summarecon2026!",
  "audience": "CUSTOMER"
}
```

Hasil: `200` + `Set-Cookie: summa_customer_session` (disimpan Postman).

---

## 2. Lihat kursi tersedia

```
GET https://summarecon-admin.axtra.tech/api/events/EVT-ATR-001/seats
```

Tanpa body. Cari item dengan `"status": "AVAILABLE"`, ambil `event_seat_id`-nya
(misalnya `ATR-A-02`).

---

## 3. Tahan kursi (10 menit) — tidak wajib, tapi ini yang dipakai customer side

```
POST https://summarecon-admin.axtra.tech/api/events/EVT-ATR-001/holds
Content-Type: application/json
```

```json
{
  "event_seat_ids": ["ATR-A-02", "ATR-A-03"]
}
```

Perhatikan: **tidak perlu** `user_id` — diambil dari cookie. Hasil `201`:

```json
{"data":{"hold_id":"HLD-MW6JN3GD","event_seat_ids":["ATR-A-02","ATR-A-03"],
"reserved_until":"2026-11-07T15:23:52.189Z","status":"ACTIVE"}}
```

Kursi sekarang `LOCKED`.

---

## 4. Buat order — INI yang bikin data masuk admin

```
POST https://summarecon-admin.axtra.tech/api/orders
Content-Type: application/json
```

```json
{
  "event_id": "EVT-ATR-001",
  "seat_ids": ["ATR-A-02", "ATR-A-03"],
  "attendee_name": "Demo Panitia",
  "simulate_payment": true
}
```

Hasil `201`:

```json
{"data":{"order_id":"ORD-64432782-7","order_code":"ORD-2026-0007",
"order_status":"PAID","quantity":2,"total_amount":700000,"tickets":2,
"qr_token":"TKT.ORD-2026-0007._dJQ3F3lhuQLGUIHp0FgoA.H0YmhjRiiAWTTEP212vrLR6ZXbZcdbgF"}}
```

Efeknya sekaligus:
- order muncul di admin
- kursi jadi `SOLD`
- tiket terbit (`ISSUED`)
- QR terbit

**Tanpa `simulate_payment`**, order tersimpan `PENDING` (belum PAID, QR belum terbit).

### Kalau pakai kuota / standing (bukan kursi)

```json
{
  "event_id": "EVT-DWT-001",
  "items": [{ "section_id": "EVS-DWT-SA", "quantity": 2 }],
  "attendee_name": "Demo Panitia",
  "simulate_payment": true
}
```

---

## 5. Ambil QR sebagai PNG

```
GET https://summarecon-admin.axtra.tech/api/customer/orders/ORD-64432782-7/qr?format=png
```

Tanpa body. Hasil `200` `image/png`.

Versi JSON (ada `token`, `remaining`, `participants`):

```
GET https://summarecon-admin.axtra.tech/api/customer/orders/ORD-64432782-7/qr
```

---

## 6. Scan tiket (check-in petugas)

```
POST https://summarecon-admin.axtra.tech/api/checkin/public
Content-Type: application/json
x-scan-code: SCAN-2026
```

```json
{
  "qr_token_hash": "TKT.ORD-2026-0007._dJQ3F3lhuQLGUIHp0FgoA.H0YmhjRiiAWTTEP212vrLR6ZXbZcdbgF",
  "event_id": "EVT-ATR-001"
}
```

- Scan ke-1 → `200`, `"scan": "1/2"`
- Scan ke-2 → `200`, `"scan": "2/2"`
- Scan ke-3 → `409` `BATAS_SCAN`

---

## 7. Cek order di admin

```
POST https://summarecon-admin.axtra.tech/api/auth/login
Content-Type: application/json
```
```json
{ "email": "admin.demo@example.test", "password": "Summarecon2026!", "audience": "ADMIN" }
```

lalu:

```
GET https://summarecon-admin.axtra.tech/api/bookings
```

Cari `order_code` hasil langkah 4.

Halaman visual: `https://summarecon-admin.axtra.tech/bookings`

---

## Ringkasan endpoint

| # | Method | Endpoint | Auth |
|---|---|---|---|
| 1 | POST | `/api/auth/login` | — (audience CUSTOMER) |
| 2 | GET | `/api/events/:id/seats` | — |
| 3 | POST | `/api/events/:id/holds` | cookie peserta |
| 4 | POST | `/api/orders` | cookie peserta |
| 5 | GET | `/api/customer/orders/:id/qr?format=png` | cookie peserta |
| 6 | POST | `/api/checkin/public` | header `x-scan-code` |
| 7 | GET | `/api/bookings` | cookie admin |

Collection siap-import (semua terisi otomatis):
`docs/postman/Summarecon-Order.postman_collection.json`
