import { prisma } from "@/lib/db";
import { ok, notFound, parseJsonSafe } from "@/lib/api";

/** GET /api/bookings/:id — order lengkap: item, pembayaran, tiket, QR, refund. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      event: true,
      items: { include: { category: true, seat: true } },
      payments: { include: { callbacks: true } },
      tickets: { include: { seat: true, section: true } },
      eTicket: true,
      refunds: { include: { lines: true } },
    },
  });
  if (!order) return notFound("Order");

  return ok({
    order_id: order.id,
    order_code: order.orderCode,
    event: { id: order.eventId, name: order.event.eventName, start_at: order.event.startAt },
    buyer: parseJsonSafe<unknown>(order.buyerSnapshot, null),
    order_status: order.orderStatus,
    quantity: order.quantity,
    subtotal: order.subtotal,
    admin_fee: order.adminFee,
    total_amount: order.totalAmount,
    created_at: order.createdAt,
    paid_at: order.paidAt,
    expires_at: order.expiresAt,
    items: order.items.map((i) => ({
      order_item_id: i.id,
      category: i.category?.categoryName ?? null,
      seat: i.seat?.seatLabel ?? null,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      line_total: i.lineTotal,
    })),
    payments: order.payments.map((p) => ({
      payment_id: p.id,
      method: p.paymentMethod,
      provider: p.provider,
      status: p.paymentStatus,
      amount: p.amount,
      initiated_at: p.initiatedAt,
      paid_at: p.paidAt,
      expires_at: p.expiresAt,
      callbacks: p.callbacks.map((c) => ({ id: c.id, type: c.eventType, result: c.processingResult, received_at: c.receivedAt })),
    })),
    tickets: order.tickets.map((t) => ({
      ticket_id: t.id,
      ticket_code: t.ticketCode,
      participant_name: t.participantName,
      seat: t.seat?.seatLabel ?? null,
      section: t.section?.sectionName ?? null,
      ticket_status: t.ticketStatus,
      attendance_status: t.attendanceStatus,
    })),
    e_ticket: order.eTicket
      ? {
          e_ticket_id: order.eTicket.id,
          valid_ticket_count: order.eTicket.validTicketCount,
          successful_scan_count: order.eTicket.successfulScanCount,
          max_scan: order.eTicket.maxSuccessfulScanCount,
          status_summary: order.eTicket.ticketStatusSummary,
        }
      : null,
    refunds: order.refunds.map((r) => ({ refund_id: r.id, status: r.status, amount: r.refundAmount, ticket_count: r.lines.length })),
  });
}
