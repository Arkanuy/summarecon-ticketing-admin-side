import { prisma } from "@/lib/db";
import { ok, paging, pageMeta, badRequest, created } from "@/lib/api";

/** GET /api/refunds?status=&event_id=&page=&perPage= */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, perPage, skip, take } = paging(url);
  const status = url.searchParams.get("status");
  const eventId = url.searchParams.get("event_id");

  const where = { ...(status ? { status } : {}), ...(eventId ? { eventId } : {}) };
  const [total, rows] = await Promise.all([
    prisma.refund.count({ where }),
    prisma.refund.findMany({ where, skip, take, orderBy: { requestedAt: "desc" }, include: { lines: { include: { ticket: true } }, order: true } }),
  ]);

  return ok({
    meta: pageMeta(total, page, perPage),
    items: rows.map((r) => ({
      refund_id: r.id,
      refund_code: r.refundCode,
      refund_type: r.refundType,
      order_id: r.orderId,
      status: r.status,
      refund_data_status: r.refundDataStatus,
      amount: r.refundAmount,
      quantity: r.quantity,
      requested_at: r.requestedAt,
      participants: r.lines.map((l) => l.ticket.participantName),
      destination_complete: Boolean(r.destMethod && r.destAccountNumber && r.destAccountHolder),
    })),
  });
}
