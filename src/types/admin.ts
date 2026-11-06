/** Tipe mengikuti istilah di dokumen analisis (§8) supaya nama status sama persis. */

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type PaymentStatus =
  | "INITIATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type TicketStatus = "RESERVED" | "ISSUED" | "CANCELLED" | "REFUNDED";
export type AttendanceStatus = "NOT_CHECKED_IN" | "CHECKED_IN";

export type RefundStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "REJECTED"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "NEED_CONFIRMATION";

export type RefundSource = "PARTICIPANT" | "EVENT_CANCELLED";
export type RefundMethod = "BANK" | "EWALLET";

/** §3.3 — tiga metode booking. */
export type BookingMode = "SEAT" | "QUOTA" | "STANDING";

export type EventStatus = "DRAF" | "DIJUAL" | "DIBATALKAN";
export type SeatStatus = "available" | "hold" | "sold" | "blocked";

export type Role = "ADMIN" | "CHECKIN_OFFICER";

export interface Venue {
  id: string;
  name: string;
  city: string;
  capacity: number;
}

export interface EventCategory {
  id: string;
  name: string;
  price: number;
  quota: number;
  sold: number;
}

export interface AdminEvent {
  id: string;
  name: string;
  venueId: string;
  category: string;
  date: string;
  time: string;
  status: EventStatus;
  bookingMode: BookingMode;
  published: boolean;
  saleStart: string;
  saleEnd: string;
  categories: EventCategory[];
  /** Hanya untuk bookingMode SEAT. Kunci `A-01`, nilai status kursi. */
  seats?: Record<string, SeatStatus>;
  /** Baris kursi yang dipakai di denah, urut dari panggung. */
  seatRows?: string[];
  seatCols?: number;
}

export interface Ticket {
  id: string;
  orderId: string;
  name: string;
  seat: string | null;
  category: string;
  status: TicketStatus;
  attendance: AttendanceStatus;
}

export interface Order {
  id: string;
  eventId: string;
  buyer: string;
  email: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
}

export interface Refund {
  id: string;
  orderId: string;
  ticketId: string;
  amount: number;
  status: RefundStatus;
  source: RefundSource;
  method: RefundMethod | null;
  bank: string | null;
  accountNo: string | null;
  accountName: string | null;
  requestedAt: string;
  updatedAt: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface ScanLog {
  at: string;
  orderId: string;
  ticketId: string | null;
  officer: string;
  result: "VALID" | "LIMIT" | "INVALID";
}
