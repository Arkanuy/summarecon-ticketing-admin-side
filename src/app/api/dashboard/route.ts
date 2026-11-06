import { prisma } from "@/lib/db";
import { ok } from "@/lib/api";

/** GET /api/dashboard — ringkasan admin, angka dihitung dari DB bukan dummy statis. */
export async function GET() {
  const [events, soldSeats, ordersPaid, checkedIn, openRefund] = await Promise.all([
    prisma.event.findMany({ include: { sections: true, venue: true } }),
    prisma.eventSeat.count({ where: { status: "SOLD" } }),
    prisma.order.aggregate({ where: { orderStatus: "PAID" }, _sum: { totalAmount: true }, _count: true }),
    prisma.checkinRecord.count({ where: { scanResult: "SUCCESS" } }),
    prisma.refund.count({ where: { status: { in: ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "NEED_CONFIRMATION"] } } }),
  ]);

  const soldFromSections = events.reduce((sum, e) => sum + e.sections.reduce((s, x) => s + x.soldQuantity, 0), 0);
  const capacity = events.reduce((sum, e) => sum + e.sections.reduce((s, x) => s + x.capacity, 0), 0);

  return ok({
    events_total: events.length,
    events_public: events.filter((e) => ["PUBLISHED", "SALES_OPEN"].includes(e.eventStatus)).length,
    tickets_sold: Math.max(soldFromSections, soldSeats),
    capacity,
    occupancy_percent: capacity ? Math.round((Math.max(soldFromSections, soldSeats) / capacity) * 100) : 0,
    revenue: ordersPaid._sum.totalAmount ?? 0,
    orders_paid: ordersPaid._count,
    checkins: checkedIn,
    refunds_open: openRefund,
    per_event: events.map((e) => ({
      event_id: e.id,
      event_name: e.eventName,
      status: e.eventStatus,
      venue: e.venue.venueName,
      start_at: e.startAt,
      sold: e.sections.reduce((s, x) => s + x.soldQuantity, 0),
      capacity: e.sections.reduce((s, x) => s + x.capacity, 0),
    })),
  });
}
