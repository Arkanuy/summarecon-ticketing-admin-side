import { prisma } from "@/lib/db";

/**
 * Satu-satunya tempat transisi status event.
 *
 * Aturan yang dijaga di sini:
 * - `published_at` adalah SATU-SATUNYA penanda publik/tidak. Diisi saat publish,
 *   di-null-kan saat unpublish. UI membaca kolom ini, jadi tidak boleh ada jalur
 *   yang mengubah `event_status` ke status publik tanpa menyentuh `published_at`.
 * - Status publik yang sah hanya PUBLISHED / SALES_OPEN / ONGOING / COMPLETED.
 *   CANCELLED dan DRAFT bukan publik, jadi `published_at` harus kosong.
 * - Event batal tidak bisa langsung dijual lagi; harus lewat `reactivate`.
 */

export const EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "SALES_OPEN",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Status yang boleh dilihat peserta. */
export const PUBLIC_STATUSES: EventStatus[] = ["PUBLISHED", "SALES_OPEN", "ONGOING", "COMPLETED"];

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draf",
  PUBLISHED: "Terbit",
  SALES_OPEN: "Penjualan dibuka",
  ONGOING: "Berlangsung",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

/** Aksi bernama. Klien tidak boleh mengirim status mentah. */
export type EventAction = "publish" | "unpublish" | "open_sales" | "close_sales" | "cancel" | "reactivate";

export const EVENT_ACTION_LABEL: Record<EventAction, string> = {
  publish: "Terbitkan",
  unpublish: "Tarik ke draf",
  open_sales: "Buka penjualan",
  close_sales: "Tutup penjualan",
  cancel: "Batalkan event",
  reactivate: "Aktifkan ulang",
};

/** Aksi yang boleh ditawarkan untuk status saat ini. */
export function allowedActions(status: string): EventAction[] {
  switch (status) {
    case "DRAFT":
      return ["publish", "cancel"];
    case "PUBLISHED":
      return ["open_sales", "close_sales", "unpublish", "cancel"];
    case "SALES_OPEN":
      return ["close_sales", "cancel"];
    case "ONGOING":
      return ["close_sales"];
    case "COMPLETED":
      return [];
    case "CANCELLED":
      return ["reactivate"];
    default:
      return ["publish", "cancel"];
  }
}

export type TransitionResult =
  | { ok: true; status: EventStatus; publishedAt: Date | null; restoredSeats: number }
  | { ok: false; code: string; message: string };

/**
 * Alasan penjualan belum boleh dibuka. Mengembalikan null kalau lolos.
 * Dipakai server sebelum mengubah status ke SALES_OPEN.
 */
export async function salesBlocker(eventId: string): Promise<string | null> {
  const categories = await prisma.ticketCategory.findMany({
    where: { eventId },
    select: { id: true, price: true, quota: true, categoryName: true },
  });
  if (categories.length === 0) return "Event belum punya kategori tiket.";

  const priced = categories.filter((c) => c.price > 0 && c.quota > 0);
  if (priced.length === 0) return "Semua kategori belum punya harga dan kuota yang sah.";

  const sections = await prisma.eventSection.count({ where: { eventId } });
  if (sections === 0) return "Event belum punya section/denah.";

  const seats = await prisma.eventSeat.count({ where: { eventId } });
  const usesSeat = sections > 0 && seats > 0;
  if (!usesSeat) {
    const quota = await prisma.eventSection.aggregate({ where: { eventId }, _sum: { capacity: true } });
    if ((quota._sum.capacity ?? 0) <= 0) return "Tidak ada kuota untuk dijual.";
  }
  return null;
}

/**
 * Terapkan aksi ke event. Melempar `TransitionResult` gagal, bukan exception,
 * supaya route handler bisa menjawab 409/400 dengan pesan yang jelas.
 */
export async function applyEventAction(eventId: string, action: EventAction, actorId?: string): Promise<TransitionResult> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { ok: false, code: "NOT_FOUND", message: "Event tidak ditemukan." };

  const current = event.eventStatus;
  if (!allowedActions(current).includes(action)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Aksi "${EVENT_ACTION_LABEL[action]}" tidak tersedia untuk event berstatus ${EVENT_STATUS_LABEL[current as EventStatus] ?? current}.`,
    };
  }

  const now = new Date();
  let next: EventStatus;
  let publishedAt: Date | null = event.publishedAt;
  let seatFix: { status: string; statusSource: string } | null = null;

  switch (action) {
    case "publish":
      next = "PUBLISHED";
      publishedAt = event.publishedAt ?? now;
      break;
    case "open_sales": {
      const blocker = await salesBlocker(eventId);
      if (blocker) return { ok: false, code: "SALES_NOT_READY", message: blocker };
      next = "SALES_OPEN";
      publishedAt = event.publishedAt ?? now;
      break;
    }
    case "close_sales":
      /* Jual ditutup tapi event tetap terlihat peserta. */
      next = "PUBLISHED";
      publishedAt = event.publishedAt ?? now;
      if (event.salesEndAt && event.salesEndAt > now) {
        await prisma.event.update({ where: { id: eventId }, data: { salesEndAt: now } });
      }
      break;
    case "unpublish":
      next = "DRAFT";
      publishedAt = null;
      break;
    case "cancel":
      next = "CANCELLED";
      publishedAt = null;
      seatFix = { status: "DISABLED_EVENT_CANCELLED", statusSource: "EVENT_CANCELLED" };
      break;
    case "reactivate":
      next = "DRAFT";
      publishedAt = null;
      seatFix = { status: "AVAILABLE", statusSource: "EVENT_REACTIVATED" };
      break;
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      eventStatus: next,
      publishedAt,
      ...(action === "cancel"
        ? { cancelledAt: now, cancelledBy: actorId ?? null, cancelReason: event.cancelReason }
        : { cancelledAt: null, cancelledBy: null, cancelReason: null }),
    },
  });

  let restoredSeats = 0;
  if (seatFix) {
    const res = await prisma.eventSeat.updateMany({
      where: { eventId, status: action === "cancel" ? { not: "SOLD" } : "DISABLED_EVENT_CANCELLED" },
      data: seatFix,
    });
    restoredSeats = res.count;
  }

  return { ok: true, status: updated.eventStatus as EventStatus, publishedAt: updated.publishedAt, restoredSeats };
}

/** Status publik efektif, dipakai halaman peserta. */
export function isPubliclyVisible(status: string, publishedAt: Date | null) {
  return publishedAt !== null && PUBLIC_STATUSES.includes(status as EventStatus);
}
