import { prisma } from "@/lib/db";
import { ok, paging, pageMeta, parseJsonSafe } from "@/lib/api";

/** GET /api/bookings?status=&event_id=&q=&page=&perPage= */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, perPage, skip, take } = paging(url);
  const status = url.searchParams.get("status");
  const eventId = url.searchParams.get("event_id");
  const q = url.searchParams.get("q");

  const where = {
    ...(status ? { orderStatus: status } : {}),
    ...(eventId ? { eventId } : {}),
    ...(q ? { OR: [{ orderCode: { contains: q } }, { id: { contains: q } }] } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: { event: true, payments: true, tickets: true } }),
  ]);

  return ok({
    meta: pageMeta(total, page, perPage),
    items: rows.map((o) => {
      const buyer = parseJsonSafe<{ full_name?: string; email?: string }>(o.buyerSnapshot, {});
      return {
        order_id: o.id,
        order_code: o.orderCode,
        event: { id: o.eventId, name: o.event.eventName },
        buyer: { name: buyer.full_name ?? null, email: buyer.email ?? null },
        order_status: o.orderStatus,
        payment_status: o.payments[0]?.paymentStatus ?? null,
        quantity: o.quantity,
        total_amount: o.totalAmount,
        ticket_count: o.tickets.length,
        created_at: o.createdAt,
        paid_at: o.paidAt,
      };
    }),
  });
}
