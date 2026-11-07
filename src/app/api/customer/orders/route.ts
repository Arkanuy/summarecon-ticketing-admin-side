import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/guard";
import { settlePendingOrders } from "@/lib/settle";

/** GET /api/customer/orders — daftar order milik peserta yang login. */
export async function GET(request: Request) {
  const guard = await requireCustomer(request);
  if ("response" in guard) return guard.response;
  const { user } = guard;

  /* Order PENDING dari alur bayar simulasi diselesaikan dulu supaya data tidak menggantung. */
  await settlePendingOrders(user.userId).catch(() => 0);

  const orders = await prisma.order.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    include: { event: true, tickets: true, eTicket: true },
  });

  return ok(
    orders.map((o) => ({
      order_id: o.id,
      order_code: o.orderCode,
      event: { id: o.eventId, name: o.event.eventName, start_at: o.event.startAt },
      order_status: o.orderStatus,
      ticket_count: o.tickets.length,
      total_amount: o.totalAmount,
      created_at: o.createdAt,
      e_ticket: o.eTicket
        ? {
            e_ticket_id: o.eTicket.id,
            valid_ticket_count: o.eTicket.validTicketCount,
            successful_scan_count: o.eTicket.successfulScanCount,
            remaining: Math.max(0, o.eTicket.validTicketCount - o.eTicket.successfulScanCount),
            status_summary: o.eTicket.ticketStatusSummary,
          }
        : null,
    })),
  );
}
