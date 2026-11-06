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
