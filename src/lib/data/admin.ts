import type {
  AdminEvent,
  SeatStatus,
  Order,
  Refund,
  ScanLog,
  StaffUser,
  Ticket,
  Venue,
} from "@/types/admin";

/** Data contoh. Semua status mengikuti dokumen analisis §8.
 *  Ganti dengan query DB saat backend siap; bentuk tipe di src/types/admin.ts yang jadi acuan. */

export const venues: Venue[] = [
  { id: "v1", name: "Summarecon Mall Bandung Hall", city: "Bandung", capacity: 1200 },
  { id: "v2", name: "Summarecon Ballroom Serpong", city: "Tangerang", capacity: 800 },
  { id: "v3", name: "Summarecon Open Air Bekasi", city: "Bekasi", capacity: 2500 },
];

const SEAT_ROWS = ["A", "B", "C", "D", "E", "F"];
const SEAT_COLS = 12;

/* Denah tetap dengan pola deterministik supaya tampilan sama setiap reload. */
function buildSeats(): Record<string, SeatStatus> {
  const map: Record<string, SeatStatus> = {};
  let seed = 7;
  for (const row of SEAT_ROWS) {
    for (let n = 1; n <= SEAT_COLS; n++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const p = seed / 2147483648;
      const id = `${row}-${String(n).padStart(2, "0")}`;
      map[id] = p < 0.55 ? "sold" : p < 0.68 ? "hold" : p < 0.72 ? "blocked" : "available";
    }
    if (row === "F") {
      for (let n = 9; n <= SEAT_COLS; n++) map[`${row}-${String(n).padStart(2, "0")}`] = "blocked";
    }
  }
  return map;
}

export const events: AdminEvent[] = [
  {
    id: "sound-of-summarecon",
    name: "Sound of Summarecon",
    venueId: "v1",
    category: "Musik",
    date: "2026-11-21",
    time: "19.00",
    status: "DIJUAL",
    bookingMode: "SEAT",
    published: true,
    saleStart: "2026-10-20 10:00",
    saleEnd: "2026-11-20 23:59",
    categories: [
      { id: "c1", name: "VIP", price: 850000, quota: 72, sold: 61 },
      { id: "c2", name: "Gold", price: 500000, quota: 120, sold: 96 },
      { id: "c3", name: "Reguler", price: 350000, quota: 240, sold: 187 },
    ],
    seats: buildSeats(),
    seatRows: SEAT_ROWS,
    seatCols: SEAT_COLS,
  },
  {
    id: "weekend-jazz",
    name: "Weekend Jazz Society",
    venueId: "v1",
    category: "Musik",
    date: "2026-11-29",
    time: "18.30",
    status: "DIJUAL",
    bookingMode: "QUOTA",
    published: true,
    saleStart: "2026-10-25 10:00",
    saleEnd: "2026-11-28 23:59",
    categories: [
      { id: "c4", name: "Premium", price: 700000, quota: 80, sold: 54 },
      { id: "c5", name: "General Seating", price: 275000, quota: 200, sold: 131 },
    ],
  },
  {
    id: "creative-market",
    name: "The Creative Market",
    venueId: "v3",
    category: "Lifestyle",
    date: "2026-12-06",
    time: "10.00",
    status: "DIJUAL",
    bookingMode: "STANDING",
    published: true,
    saleStart: "2026-10-01 10:00",
    saleEnd: "2026-12-05 23:59",
    categories: [
      { id: "c6", name: "Standing Floor", price: 75000, quota: 500, sold: 361 },
      { id: "c7", name: "VIP Standing", price: 150000, quota: 100, sold: 58 },
    ],
  },
  {
    id: "pameran-seni-nusantara",
    name: "Pameran Seni Rupa Nusantara",
    venueId: "v2",
    category: "Pameran",
    date: "2026-12-13",
    time: "13.00",
    status: "DIBATALKAN",
    bookingMode: "QUOTA",
    published: true,
    saleStart: "2026-10-05 10:00",
    saleEnd: "2026-12-12 23:59",
    categories: [{ id: "c8", name: "Umum", price: 100000, quota: 150, sold: 92 }],
  },
  {
    id: "seminar-kreator-muda",
    name: "Seminar Kreator Muda",
    venueId: "v2",
    category: "Seminar",
    date: "2026-12-19",
    time: "09.00",
    status: "DRAF",
    bookingMode: "QUOTA",
    published: false,
    saleStart: "2026-11-25 10:00",
    saleEnd: "2026-12-18 23:59",
    categories: [{ id: "c9", name: "Umum", price: 50000, quota: 200, sold: 0 }],
  },
];

export const orders: Order[] = [
  {
    id: "ORD-2026-001",
    eventId: "sound-of-summarecon",
    buyer: "Sari Andini",
    email: "sari.a@mail.id",
    orderStatus: "PAID",
    paymentStatus: "SUCCESS",
    total: 1000000,
    createdAt: "2026-11-05 09:12",
  },
  {
    id: "ORD-2026-002",
    eventId: "sound-of-summarecon",
    buyer: "Budi Hartono",
    email: "budi.h@mail.id",
    orderStatus: "PENDING",
    paymentStatus: "PENDING",
    total: 350000,
    createdAt: "2026-11-05 10:41",
  },
  {
    id: "ORD-2026-003",
    eventId: "creative-market",
    buyer: "Rina Kusuma",
    email: "rina.k@mail.id",
    orderStatus: "PAID",
    paymentStatus: "SUCCESS",
    total: 300000,
    createdAt: "2026-11-04 16:20",
  },
  {
    id: "ORD-2026-004",
    eventId: "sound-of-summarecon",
    buyer: "Ahmad Fauzi",
    email: "ahmad.f@mail.id",
    orderStatus: "EXPIRED",
    paymentStatus: "EXPIRED",
    total: 350000,
    createdAt: "2026-11-04 11:02",
  },
  {
    id: "ORD-2026-005",
    eventId: "sound-of-summarecon",
    buyer: "Maya Lestari",
    email: "maya.l@mail.id",
    orderStatus: "PARTIALLY_REFUNDED",
    paymentStatus: "PARTIALLY_REFUNDED",
    total: 1500000,
    createdAt: "2026-11-03 20:15",
  },
  {
    id: "ORD-2026-006",
    eventId: "pameran-seni-nusantara",
    buyer: "Tomi Wijaya",
    email: "tomi.w@mail.id",
    orderStatus: "REFUNDED",
    paymentStatus: "REFUNDED",
    total: 100000,
    createdAt: "2026-10-28 14:05",
  },
];

export const tickets: Ticket[] = [
  { id: "T-001", orderId: "ORD-2026-001", name: "Sari A.", seat: "B-07", category: "Gold", status: "ISSUED", attendance: "CHECKED_IN" },
  { id: "T-002", orderId: "ORD-2026-001", name: "Dian P.", seat: "B-08", category: "Gold", status: "ISSUED", attendance: "NOT_CHECKED_IN" },
  { id: "T-003", orderId: "ORD-2026-002", name: "Budi H.", seat: "C-04", category: "Reguler", status: "RESERVED", attendance: "NOT_CHECKED_IN" },
  { id: "T-004", orderId: "ORD-2026-003", name: "Rina K.", seat: null, category: "VIP Standing", status: "ISSUED", attendance: "CHECKED_IN" },
  { id: "T-005", orderId: "ORD-2026-003", name: "Yoga P.", seat: null, category: "VIP Standing", status: "ISSUED", attendance: "CHECKED_IN" },
  { id: "T-006", orderId: "ORD-2026-004", name: "Ahmad F.", seat: "D-11", category: "Reguler", status: "CANCELLED", attendance: "NOT_CHECKED_IN" },
  { id: "T-007", orderId: "ORD-2026-005", name: "Maya L.", seat: "A-03", category: "Gold", status: "ISSUED", attendance: "CHECKED_IN" },
  { id: "T-008", orderId: "ORD-2026-005", name: "Rangga S.", seat: "A-04", category: "Gold", status: "REFUNDED", attendance: "NOT_CHECKED_IN" },
  { id: "T-009", orderId: "ORD-2026-005", name: "Nadia R.", seat: "A-05", category: "Gold", status: "ISSUED", attendance: "NOT_CHECKED_IN" },
  { id: "T-010", orderId: "ORD-2026-006", name: "Tomi W.", seat: null, category: "Umum", status: "REFUNDED", attendance: "NOT_CHECKED_IN" },
];

export const refunds: Refund[] = [
  {
    id: "RF-001", orderId: "ORD-2026-005", ticketId: "T-008", amount: 500000,
    status: "COMPLETED", source: "PARTICIPANT", method: "BANK", bank: "BCA",
    accountNo: "8820114477", accountName: "Rangga Saputra",
    requestedAt: "2026-11-04 08:30", updatedAt: "2026-11-05 13:10",
  },
  {
    id: "RF-002", orderId: "ORD-2026-006", ticketId: "T-010", amount: 100000,
    status: "REQUESTED", source: "EVENT_CANCELLED", method: null, bank: null,
    accountNo: null, accountName: null,
    requestedAt: "2026-11-05 09:00", updatedAt: "2026-11-05 09:00",
  },
  {
    id: "RF-003", orderId: "ORD-2026-001", ticketId: "T-002", amount: 500000,
    status: "UNDER_REVIEW", source: "PARTICIPANT", method: "EWALLET", bank: "GoPay",
    accountNo: "0812xxxxxx91", accountName: "Sari Andini",
    requestedAt: "2026-11-05 11:20", updatedAt: "2026-11-05 11:20",
  },
  {
    id: "RF-004", orderId: "ORD-2026-003", ticketId: "T-004", amount: 150000,
    status: "APPROVED", source: "PARTICIPANT", method: "BANK", bank: "Mandiri",
    accountNo: "1370099887", accountName: "Rina Kusuma",
    requestedAt: "2026-11-03 10:00", updatedAt: "2026-11-04 15:45",
  },
  {
    id: "RF-005", orderId: "ORD-2026-002", ticketId: "T-003", amount: 350000,
    status: "NEED_CONFIRMATION", source: "PARTICIPANT", method: "BANK", bank: "BRI",
    accountNo: "0123 0102 4455 501", accountName: "Budi H.",
    requestedAt: "2026-11-05 08:10", updatedAt: "2026-11-05 08:40",
  },
  {
    id: "RF-006", orderId: "ORD-2026-005", ticketId: "T-007", amount: 500000,
    status: "REJECTED", source: "PARTICIPANT", method: "EWALLET", bank: "OVO",
    accountNo: "0813xxxxxx22", accountName: "Maya Lestari",
    requestedAt: "2026-11-02 19:00", updatedAt: "2026-11-03 09:15",
  },
];

export const scanLogs: ScanLog[] = [
  { at: "2026-11-05 18:42", orderId: "ORD-2026-003", ticketId: "T-004", officer: "Petugas Gate A", result: "VALID" },
  { at: "2026-11-05 18:42", orderId: "ORD-2026-003", ticketId: "T-005", officer: "Petugas Gate A", result: "VALID" },
  { at: "2026-11-05 18:55", orderId: "ORD-2026-003", ticketId: null, officer: "Petugas Gate B", result: "LIMIT" },
  { at: "2026-11-05 19:03", orderId: "ORD-2026-004", ticketId: null, officer: "Petugas Gate B", result: "INVALID" },
];

export const staff: StaffUser[] = [
  { id: "u1", name: "Arkan Pratama", email: "admin@summarecon.test", role: "ADMIN", active: true },
  { id: "u2", name: "Dewi Anggraini", email: "dewi.officer@summarecon.test", role: "CHECKIN_OFFICER", active: true },
  { id: "u3", name: "Rizal Maulana", email: "rizal.officer@summarecon.test", role: "CHECKIN_OFFICER", active: false },
];
