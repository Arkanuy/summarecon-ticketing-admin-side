# Cara melihat data SQLite

Database prototipe ini adalah satu file: `prisma/dev.db`. Tidak perlu server database, cukup buka file itu.

## Pilihan 1 — Prisma Studio (paling gampang, berbasis web)

Dari folder proyek:

```bash
npx prisma studio
```

Browser terbuka di `http://localhost:5555`. Semua 34 tabel muncul di kiri, bisa diklik, difilter, dan diedit langsung.

Kalau di server VPS:

```
cd C:\summarecon-admin
npx prisma studio --port 5556
```

Lalu buka `http://<ip-vps>:5556`. **Hati-hati:** ini membuka database ke jaringan — jangan biarkan terbuka lama, dan jangan diekspos ke internet.

## Pilihan 2 — DB Browser for SQLite (aplikasi desktop, tanpa kode)

1. Unduh: https://sqlitebrowser.org/dl/
2. Buka aplikasi → **Open Database** → pilih `prisma\dev.db`
3. Tab **Browse Data** → pilih tabel di dropdown

Bisa juga jalankan query di tab **Execute SQL**:

```sql
SELECT order_code, order_status, total_amount FROM orders;
```

## Pilihan 3 — VS Code

Pasang extension **SQLite Viewer** (atau **SQLite**), lalu klik file `dev.db`. Tabel langsung tampil dan bisa diklik.

## Pilihan 4 — lewat CLI (kalau sqlite3 terpasang)

```bash
cd /path/ke/proyek
sqlite3 prisma/dev.db
```

Lalu ketik query diakhiri `;`:

```sql
.tables
SELECT * FROM events;
.quit
```

Satu baris langsung tanpa masuk prompt:

```bash
sqlite3 prisma/dev.db "SELECT event_name, event_status FROM events;"
```

## Query yang sering dipakai

```sql
-- semua event + venue
SELECT e.eventCode, e.eventName, e.eventStatus, v.venueName
FROM events e JOIN venues v ON v.id = e.venueId;

-- kursi yang masih tersedia per event
SELECT eventId, status, COUNT(*) FROM event_seats GROUP BY eventId, status;

-- order terbaru
SELECT orderCode, orderStatus, totalAmount, createdAt
FROM orders ORDER BY createdAt DESC LIMIT 10;

-- tiket yang belum check-in
SELECT t.ticketCode, t.participantName
FROM tickets t
WHERE t.ticketStatus = 'ISSUED';

-- QR dan pemakaiannya
SELECT orderId, validTicketCount, successfulScanCount
FROM e_tickets;

-- riwayat scan
SELECT scannedAt, orderId, ticketId, scanResult
FROM checkin_records ORDER BY scannedAt DESC;
```

## Di server VPS (tanpa aplikasi tambahan)

Jalankan lewat Node karena `sqlite3` CLI mungkin tidak terpasang:

```
cd C:\summarecon-admin
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.event.findMany().then(r=>{console.log(JSON.stringify(r.map(e=>({kode:e.eventCode,nama:e.eventName,status:e.eventStatus})),null,2));process.exit(0)})"
```

Ganti `event` dengan nama model lain: `order`, `ticket`, `eTicket`, `venue`, `refund`.

Untuk menghitung:

```
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.ticket.groupBy({by:['ticketStatus'],_count:true}).then(r=>{console.log(JSON.stringify(r));process.exit(0)})"
```

## Kalau ingin lihat dari browser tanpa install apa pun

Endpoit API sudah membaca database yang sama:

| URL | Isi |
|---|---|
| `/api/events` | Semua event (JSON) |
| `/api/bookings` | Semua order |
| `/api/refunds` | Semua refund |
| `/api/venues` | Venue |
| `/api/users` | Akun |
| `/api/dashboard` | Ringkasan angka |

Contoh: `https://summarecon-admin.axtra.tech/api/events`

Data yang keluar identik dengan isi SQLite, jadi ini cara tercepat kalau hanya perlu melihat.
