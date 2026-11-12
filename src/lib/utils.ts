import type {
  AttendanceStatus,
  BookingMode,
  EventCategory,
  EventStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  TicketStatus,
} from "@/types/admin";

export const rupiah = (value: number) => "Rp " + value.toLocaleString("id-ID");

/**
 * Zona waktu acara. Server VPS berjalan di UTC, jadi memformat tanggal tanpa
 * timeZone membuat acara 20 Des 03.00 WIB tampil "19 Des".
 */
const TZ = "Asia/Jakarta";

/** Tanggal acara: "Min, 20 Des 2026". */
export const fmtTanggal = (d: Date | string) =>
  new Date(d).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });

/** Jam acara: "10.00". */
export const fmtJam = (d: Date | string) =>
  new Date(d).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).replace(":", ".");

/** Tanggal + jam untuk tabel: "20 Des 2026 · 10.00". */
export const fmtTanggalJam = (d: Date | string) =>
  `${new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  })} · ${fmtJam(d)}`;

export const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

type Tone = "ok" | "hold" | "bad" | "muted";

const TONES: Record<string, Tone> = {
  PAID: "ok",
  SUCCESS: "ok",
  ISSUED: "ok",
  CHECKED_IN: "ok",
  COMPLETED: "ok",
  DIJUAL: "ok",
  APPROVED: "ok",
  UNDER_REVIEW: "ok",
  PENDING: "hold",
  RESERVED: "hold",
  PROCESSING: "hold",
  NEED_CONFIRMATION: "hold",
  REQUESTED: "hold",
  DRAF: "hold",
  NOT_CHECKED_IN: "hold",
  FAILED: "bad",
  EXPIRED: "bad",
  CANCELLED: "bad",
  REFUNDED: "bad",
  REJECTED: "bad",
  DIBATALKAN: "bad",
  PARTIALLY_REFUNDED: "bad",
};

export const statusTone = (status: string): Tone => TONES[status] ?? "muted";

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DIJUAL: "Dijual",
  DRAF: "Draf",
  DIBATALKAN: "Dibatalkan",
};

/**
 * Label status event untuk nilai yang benar-benar dipakai database
 * (DRAFT/PUBLISHED/SALES_OPEN/ONGOING/COMPLETED/CANCELLED). Sumber tunggalnya
 * ada di lib/event-status.ts supaya tidak ada dua daftar yang bisa berbeda.
 */
export { EVENT_STATUS_LABEL as EVENT_STATUS_LABEL_DB } from "@/lib/event-status";

export const BOOKING_MODE_LABEL: Record<BookingMode, string> = {
  SEAT: "Book by Seat",
  QUOTA: "Book by Quota",
  STANDING: "Standing",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PAID: "Terbayar",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
  PARTIALLY_REFUNDED: "Refund sebagian",
  REFUNDED: "Refund penuh",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  INITIATED: "Dimulai",
  PENDING: "Menunggu",
  SUCCESS: "Berhasil",
  FAILED: "Gagal",
  EXPIRED: "Kedaluwarsa",
  REFUND_PENDING: "Refund menunggu",
  PARTIALLY_REFUNDED: "Refund sebagian",
  REFUNDED: "Refund penuh",
};

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  RESERVED: "Direservasi",
  ISSUED: "Terbit",
  CANCELLED: "Dibatalkan",
  REFUNDED: "Refund",
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  NOT_CHECKED_IN: "Belum check-in",
  CHECKED_IN: "Sudah check-in",
};

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  REQUESTED: "Menunggu data refund",
  UNDER_REVIEW: "Menunggu persetujuan",
  REJECTED: "Ditolak",
  APPROVED: "Disetujui, menunggu proses",
  PROCESSING: "Sedang diproses",
  COMPLETED: "Selesai",
  NEED_CONFIRMATION: "Perlu konfirmasi data",
};

/** Tiket yang masih bisa dipakai check-in — dasar batas jumlah scan (§8.6). */
export const isValidForScan = (t: { status: TicketStatus }) => t.status === "ISSUED";

export const eventTicketCount = (event: { categories: EventCategory[] }) =>
  event.categories.reduce((sum, c) => sum + c.sold, 0);

export const ticketSummary = (categories: EventCategory[]) => {
  const quota = categories.reduce((sum, c) => sum + c.quota, 0);
  const sold = categories.reduce((sum, c) => sum + c.sold, 0);
  return { quota, sold, remaining: quota - sold };
};

/** Nada artistrip kartu event, dipetakan dari kategori. */
export type EventTone = "musik" | "seminar" | "lifestyle" | "pameran";

export const eventTone = (category: string): EventTone => {
  const c = category.toLowerCase();
  if (c.includes("musik") || c.includes("konser")) return "musik";
  if (c.includes("seminar") || c.includes("workshop")) return "seminar";
  if (c.includes("life") || c.includes("festival") || c.includes("kuliner")) return "lifestyle";
  return "pameran";
};
