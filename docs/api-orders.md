# POST /api/orders — buat pesanan dari customer side

Endpoint ini yang menyambung customer side ke admin side. Sebelum ada, pesanan hanya
tersimpan di localStorage browser sehingga tidak pernah muncul di dashboard admin.

## Satu panggilan, seluruh rantai

```
POST /api/orders
  1. cek event dijual + periode penjualan
  2. klaim kursi (AVAILABLE → SOLD) secara atomik  ← cegah pemesanan ganda
  3. buat orders + order_items + tickets
  4. kurangi kuota section (Book by Quota / Standing)
  5. terbitkan e_ticket + QR
```

Kalau satu langkah gagal, semuanya dibatalkan (database transaction).

## Autentikasi

Butuh sesi peserta: cookie `summa_customer_session`.
Login dulu lewat `POST /api/auth/login` dengan `audience: "CUSTOMER"`.

## Body

```json
{
  "event_id": "EVT-ATR-001",
  "seat_ids": ["ATR-A-01", "ATR-A-02"],
  "attendee_name": "Nadia Putri",
  "simulate_payment": true
}
```

Untuk Book by Quota atau Standing, ganti `seat_ids` dengan `items`:

```json
{
  "event_id": "EVT-DWT-001",
  "items": [{ "section_id": "EVS-DWT-SA", "quantity": 2 }],
  "attendee_name": "Nadia Putri",
  "simulate_payment": true
}
```

| Field | Wajib | Keterangan |
|---|---|---|
| `event_id` | ya | ID event |
| `seat_ids` | salah satu | Daftar `event_seat_id` untuk section Book by Seat |
| `items` | salah satu | `[{ section_id, category_id?, quantity }]` untuk kuota/standing |
| `attendee_name` | tidak | Nama pemesan; dipakai kalau `attendees` kosong |
| `attendees` | tidak | Nama per tiket, urut sesuai tiket |
| `simulate_payment` | tidak | `true` = langsung PAID, kursi SOLD, QR terbit |

## Response 201

```json
{
  "data": {
    "order_id": "ORD-56606800-8",
    "order_code": "ORD-2026-0008",
    "order_status": "PAID",
    "quantity": 2,
    "total_amount": 700000,
    "tickets": 2,
    "qr_token": "TKT.ORD-2026-0008.H5amaM7oBcKze8LJAphPNg.c_hvFF8NVOxz54h7qbKxIkd7DPj2rugF"
  }
}
```

`qr_token` inilah yang dirender jadi QR. Formatnya `TKT.<order_code>.<random>.<sig>`
ditandatangani HMAC-SHA256 dengan `QR_SIGNING_SECRET`.

## Kode error

| Status | Code | Arti |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Belum login sebagai peserta |
| 400 | `EVENT_KOSONG` | `event_id` tidak diisi |
| 400 | `PILIHAN_KOSONG` | Tidak ada kursi maupun item |
| 404 | `EVENT_TIDAK_DITEMUKAN` | Event tidak ada |
| 409 | `EVENT_TIDAK_DIJUAL` | Event draf, selesai, atau dibatalkan |
| 409 | `PERIODE_JUAL_TUTUP` | Lewat `sales_end_at` |
| 409 | `KURSI_SUDAH_DIAMBIL` | Kursi sudah dipesan orang lain (pemesanan ganda) |
| 409 | `KUOTA_HABIS` | Sisa kuota section tidak cukup |
| 400 | `SECTION_PERLU_KURSI` | Section Book by Seat tidak boleh dipesan lewat `items` |
| 400 | `KURSI_BUKAN_BOOK_BY_SEAT` | Kursi milik section kuota/standing |

## Bukti pencegahan pemesanan ganda

Dua permintaan bersamaan untuk kursi yang sama: yang pertama menang, yang kedua dapat
`409 KURSI_SUDAH_DIAMBIL`. Ini dijaga di level database:

```sql
UPDATE event_seats
SET status = 'SOLD'
WHERE event_seat_id = ? AND status = 'AVAILABLE';
-- kalau affected rows = 0, kursi sudah diambil orang lain
```

## Checklist integrasi customer side

- [ ] Login peserta dulu, simpan cookie
- [ ] `POST /api/orders` dengan `seat_ids` hasil pilihan di denah
- [ ] Tampilkan `qr_token` sebagai QR (`/api/customer/orders/:id/qr?format=png` juga tersedia)
- [ ] Hapus fallback localStorage — kalau 4xx, tampilkan pesan error asli
- [ ] Setelah sukses, muat ulang denah supaya kursi tampak terjual
