# Buat QR Ticket lewat Postman

Panduan langkah demi langkah untuk menerbitkan QR e-ticket dari sisi customer, lalu memindainya sebagai petugas.

## Cara cepat: import collection

Berkas collection ada di [`docs/postman/Summarecon-QR.postman_collection.json`](./postman/Summarecon-QR.postman_collection.json).

1. Buka Postman → **Import** → pilih berkas itu.
2. Collection sudah berisi semua variabel: `baseUrl`, `scanUrl`, `scanCode`, `orderId`, dan akun demo.
3. Jalankan request **1 → 2 → 3a → 4** berurutan (atau tekan **Run collection**).

Collection ini sudah diuji dengan Newman: **6 request, 13 assertion, 0 gagal**.

---

## Cara manual (kalau ingin mengetik sendiri)

### Langkah 1 — Login customer

| | |
|---|---|
| Method | `POST` |
| URL | `https://summarecon-admin.axtra.tech/api/auth/login` |
| Headers | `Content-Type: application/json` |

Body → pilih **raw** → **JSON**:

```json
{
  "email": "nadia.demo@example.test",
  "password": "Summarecon2026!",
  "audience": "CUSTOMER"
}
```

Hasil: `200` dan cookie `summa_customer_session` **tersimpan otomatis** oleh Postman.

> Kalau cookie tidak tersimpan: buka **Settings → General → Cookie jar** dan pastikan aktif. Tanpa cookie, langkah berikutnya akan `401`.

---

### Langkah 2 — Lihat order

| | |
|---|---|
| Method | `GET` |
| URL | `https://summarecon-admin.axtra.tech/api/customer/orders` |
| Headers | — (cookie sudah otomatis) |

Hasil: daftar order milik akun itu. Cari yang `"order_status": "PAID"`.

Catat `order_id`-nya, misalnya `ORD-QRREAL-1`.

> QR hanya bisa diterbitkan untuk order berstatus `PAID` (atau yang mengandung `REFUND`). Selain itu `409 ORDER_BELUM_DIBAYAR`.

---

### Langkah 3a — Ambil QR sebagai JSON

| | |
|---|---|
| Method | `GET` |
| URL | `https://summarecon-admin.axtra.tech/api/customer/orders/ORD-QRREAL-1/qr` |

Hasil:

```json
{
  "data": {
    "order_code": "QRREAL-0001",
    "token": "TKT.QRREAL-0001.4lNHQYxEHxsRSMSbeG97Xg.LIjBHwhu27a2h3OyokS1B-6lgeLTdGr_",
    "valid_ticket_count": 4,
    "successful_scan_count": 0,
    "remaining": 4,
    "exhausted": false,
    "participants": [ { "name": "Sari A.", "status": "ISSUED" } ],
    "data_url": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

**Melihat gambarnya di Postman:** copy nilai `data_url`, buka tab **Visualizer**, atau tempel ke browser. Karena `data_url` sudah berupa PNG base64, tidak perlu generator QR apa pun.

**Menyimpan token untuk langkah berikut:** di tab **Tests**, isi:

```javascript
pm.collectionVariables.set("qrToken", pm.response.json().data.token);
```

---

### Langkah 3b — Ambil QR sebagai file PNG

| | |
|---|---|
| Method | `GET` |
| URL | `https://summarecon-admin.axtra.tech/api/customer/orders/ORD-QRREAL-1/qr?format=png` |

Hasil: `Content-Type: image/png`, 720×720.

Di Postman tekan **Save Response → Save to a file**, beri nama `ticket.png`. Itu file yang siap dicetak atau dikirim lewat WhatsApp.

---

### Langkah 4 — Pindai sebagai petugas

Tidak butuh login admin, cukup kode petugas.

| | |
|---|---|
| Method | `POST` |
| URL | `https://summarecon-scan.axtra.tech/api/checkin/public` |
| Headers | `Content-Type: application/json`<br>`x-scan-code: SCAN-2026` |

Body:

```json
{
  "qr_token_hash": "TKT.QRREAL-0001.4lNHQYxEHxsRSMSbeG97Xg.LIjBHwhu27a2h3OyokS1B-6lgeLTdGr_",
  "event_id": "EVT-ATR-001"
}
```

Hasil scan pertama:

```json
{
  "data": {
    "result": "VALID",
    "ticket": { "ticket_id": "TKT-QRREAL-1", "participant_name": "Sari A." },
    "scan": "1/4",
    "remaining": 3
  }
}
```

Kirim ulang request yang sama: `2/4`, lalu `3/4`, `4/4`, dan yang kelima:

```json
{ "error": { "code": "BATAS_SCAN", "message": "Sudah digunakan: 4/4" } }
```

---

## Kalau hasilnya bukan 200

| Yang muncul | Sebab | Perbaikan |
|---|---|---|
| `401 UNAUTHENTICATED` | Cookie login tidak terkirim | Pastikan cookie jar Postman aktif, ulangi Langkah 1 |
| `403 WRONG_PORTAL` | `audience` salah | Untuk customer harus `"CUSTOMER"` |
| `404 NOT_FOUND` | Order bukan milik akun itu | Pakai `order_id` dari hasil Langkah 2 |
| `409 ORDER_BELUM_DIBAYAR` | Order masih `PENDING` | Pilih order `PAID` |
| `401 SCAN_UNAUTHORIZED` | Kode petugas salah/kosong | Header `x-scan-code: SCAN-2026` |
| `422 QR_TIDAK_DIKENAL` | Token tidak ada di database | Pastikan memakai token dari Langkah 3a, bukan teks karangan |
| `422 QR_TIDAK_SAH` | Token diubah sebagian | Token harus utuh 4 segmen; jangan diedit |

---

## Ringkasan field penting

| Field | Arti |
|---|---|
| `token` | Isi QR. Format `TKT.<kode-order>.<random>.<tanda tangan>` |
| `data_url` | Gambar PNG base64, siap `<img src>` |
| `valid_ticket_count` | Jumlah tiket yang boleh check-in |
| `successful_scan_count` | Sudah berapa kali dipakai |
| `remaining` | Sisa scan |
| `exhausted` | `true` kalau kuota habis |
| `participants[].status` | `ISSUED` = masih sah, `REFUNDED`/`CANCELLED` = tidak |

Token tidak berubah walau dipakai berkali-kali — yang berubah hanya `successful_scan_count`.
