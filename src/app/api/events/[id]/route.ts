import { prisma } from "@/lib/db";
import { ok, notFound, parseJsonSafe, badRequest } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";

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
 * PATCH /api/events/:id — publikasi / tarik event.
 * Body: { published: boolean }
 * Published -> SALES_OPEN kalau sekarang di dalam periode jual, selain itu PUBLISHED.
 * Unpublished -> DRAFT.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.published !== "boolean") {
    return badRequest("Kirim JSON { published: true|false }");
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return notFound("Event");

  let next: string;
  if (body.published) {
    const now = new Date();
    const inWindow =
      event.salesStartAt !== null &&
      event.salesEndAt !== null &&
      now >= event.salesStartAt &&
      now <= event.salesEndAt;
    next = inWindow ? "SALES_OPEN" : "PUBLISHED";
    if (inWindow) {
      // sudah dalam periode jual: catat waktu publikasi kalau belum ada
      if (!event.publishedAt) {
        await prisma.event.update({ where: { id }, data: { publishedAt: now } });
      }
    }
  } else {
    next = "DRAFT";
  }

  const updated = await prisma.event.update({ where: { id }, data: { eventStatus: next } });
  return ok({ event_id: updated.id, event_status: updated.eventStatus, published: updated.eventStatus !== "DRAFT" });
}
