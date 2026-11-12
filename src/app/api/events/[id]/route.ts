import { prisma } from "@/lib/db";
import { ok, notFound, parseJsonSafe, badRequest, fail } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";
import { applyEventAction, EVENT_ACTION_LABEL, type EventAction } from "@/lib/event-status";

/** GET /api/events/:id — detail + section + kategori + ringkasan kursi. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      layoutTemplate: true,
      snapshots: true,
      sections: true,
      categories: true,
      cancellation: true,
    },
  });
  if (!event) return notFound("Event");

  const seatStats = await prisma.eventSeat.groupBy({ by: ["status"], where: { eventId: id }, _count: true });

  return ok({
    event_id: event.id,
    event_code: event.eventCode,
    event_name: event.eventName,
    description: event.description,
    event_status: event.eventStatus,
    start_at: event.startAt,
    end_at: event.endAt,
    sales_start_at: event.salesStartAt,
    sales_end_at: event.salesEndAt,
    published_at: event.publishedAt,
    timezone: event.timezone,
    cancel_reason: event.cancelReason,
    venue: { id: event.venue.id, name: event.venue.venueName, city: event.venue.locationLabel },
    layout: event.layoutTemplate
      ? {
          template_id: event.layoutTemplate.id,
          template_name: event.layoutTemplate.templateName,
          version: event.layoutTemplate.version,
          booking_types: parseJsonSafe<string[]>(event.layoutTemplate.activeBookingTypes, []),
          elements: parseJsonSafe<unknown[]>(event.layoutTemplate.layoutElements, []),
        }
      : null,
    seats: Object.fromEntries(seatStats.map((s) => [s.status, s._count])),
    sections: event.sections.map((s) => ({
      event_section_id: s.id,
      section_id: s.sectionId,
      section_name: s.sectionName,
      booking_type: s.bookingType,
      capacity: s.capacity,
      blocked: s.blockedQuantity,
      reserved: s.reservedQuantity,
      sold: s.soldQuantity,
      available: s.availableQuantity,
      inventory_status: s.inventoryStatus,
    })),
    categories: event.categories.map((c) => ({
      ticket_category_id: c.id,
      category_name: c.categoryName,
      price: c.price,
      quota: c.quota,
      status: c.status,
      sale_start_at: c.saleStartAt,
      sale_end_at: c.saleEndAt,
    })),
    cancellation: event.cancellation
      ? { cancelled_at: event.cancellation.cancelledAt, reason: event.cancellation.reason, auto_refund: event.cancellation.autoRefundExecuted }
      : null,
  });
}

/**
 * PATCH /api/events/:id — ubah status event.
 * Body: { action: "publish"|"unpublish"|"open_sales"|"close_sales"|"cancel"|"reactivate" }
 *
 * Dulu route ini menerima { published: bool } dan { event_status: "..." } mentah.
 * Dua jalur itu saling bertentangan: `published:false` mengubah status ke DRAFT
 * tetapi meninggalkan published_at terisi, sehingga UI (yang membaca published_at)
 * tetap menampilkan "Publik". Sekarang semua transisi lewat applyEventAction,
 * satu tempat yang selalu menulis status DAN published_at bersama-sama.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const action = typeof body?.action === "string" ? body.action : null;
  if (!action) {
    return badRequest(
      `Kirim JSON { action }. Nilai sah: ${EVENT_ACTION_LABEL ? Object.keys(EVENT_ACTION_LABEL).join(", ") : ""}`,
    );
  }
  if (!(action in EVENT_ACTION_LABEL)) {
    return badRequest(`action tidak dikenal: ${action}`);
  }

  const result = await applyEventAction(id, action as EventAction, guard.user.userId);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") return notFound("Event");
    return fail(result.code === "INVALID_TRANSITION" ? 409 : 400, result.code, result.message);
  }

  return ok({
    event_id: id,
    event_status: result.status,
    published: result.publishedAt !== null,
    published_at: result.publishedAt,
    restored_seats: result.restoredSeats,
  });
}
