import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, roleAudience } from "@/lib/auth/session";
import { issueQrToken } from "@/lib/qr/token";

/**
 * POST /api/orders/:id/pay — konfirmasi pembayaran (simulasi QRIS sandbox).
 *
 * Repo customer side memisahkan "buat order" dan "bayar". Tanpa endpoint ini,
 * order berhenti di PENDING: tiket tidak terbit, kursi tidak jadi SOLD, dan QR
 * tidak pernah dibuat.
 *
 * Body (opsional): { payment_method?: "QRIS" | "TRANSFER" | "EWALLET" }
 *
 * Efek: order -> PAID, tiket -> ISSUED, kursi -> SOLD, payment SUCCESS, QR terbit.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session || roleAudience(session.roleId) !== "CUSTOMER") {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Masuk sebagai peserta untuk membayar" } },
      { status: 401 },
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const method = String(body?.payment_method ?? "QRIS").toUpperCase();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { tickets: true, eTicket: true, payments: true },
  });

  if (!order) {
    return NextResponse.json({ error: { code: "ORDER_TIDAK_DITEMUKAN", message: "Order tidak ada" } }, { status: 404 });
  }
  if (order.userId !== session.userId) {
    return NextResponse.json({ error: { code: "BUKAN_ORDER_ANDA", message: "Order ini milik akun lain" } }, { status: 403 });
  }
  if (order.orderStatus === "CANCELLED" || order.orderStatus === "EXPIRED") {
    return NextResponse.json(
      { error: { code: "ORDER_TIDAK_BISA_DIBAYAR", message: `Order berstatus ${order.orderStatus}` } },
      { status: 409 },
    );
  }

  /* Idempoten: kalau sudah PAID, kembalikan QR yang ada tanpa menggandakan data. */
  if (order.orderStatus === "PAID" && order.eTicket) {
    return NextResponse.json({
      data: {
        order_id: order.id,
        order_code: order.orderCode,
        order_status: "PAID",
        qr_token: order.eTicket.qrTokenHash,
        already_paid: true,
      },
    });
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { orderStatus: "PAID", paidAt: now },
    });

    const tickets = await tx.ticket.updateMany({
      where: { orderId: order.id, ticketStatus: "PENDING" },
      data: { ticketStatus: "ISSUED" },
    });

    /* Kursi yang ditahan untuk order ini menjadi SOLD. */
    const seatIds = order.tickets.map((t) => t.eventSeatId).filter((s): s is string => Boolean(s));
    if (seatIds.length) {
      await tx.eventSeat.updateMany({
        where: { id: { in: seatIds }, eventId: order.eventId, status: { in: ["LOCKED", "AVAILABLE"] } },
        data: { status: "SOLD", statusSource: "PAYMENT" },
      });
    }

    await tx.bookingHold.updateMany({
      where: { eventId: order.eventId, userId: session.userId, status: "ACTIVE" },
      data: { status: "CONSUMED", releasedAt: now },
    });

    if (!order.payments.some((p) => p.paymentStatus === "SUCCESS")) {
      await tx.payment.create({
        data: {
          id: `PAY-${order.id}-${Date.now().toString(36).toUpperCase()}`,
          orderId: order.id,
          provider: "SANDBOX",
          paymentMethod: method,
          providerTransactionId: `SBX-${order.orderCode}`,
          amount: order.totalAmount,
          currency: "IDR",
          paymentStatus: "SUCCESS",
          initiatedAt: now,
          paidAt: now,
        },
      });
    }

    const validCount = await tx.ticket.count({ where: { orderId: order.id, ticketStatus: "ISSUED" } });

    let token = order.eTicket?.qrTokenHash ?? null;
    if (!token) {
      const issued = issueQrToken(order.orderCode);
      await tx.eTicket.create({
        data: {
          id: `ETK-${issued.random.slice(0, 10).toUpperCase()}`,
          orderId: order.id,
          eventId: order.eventId,
          qrTokenHash: issued.token,
          issuedAt: now,
          ticketQuantityAtIssue: validCount,
          validTicketCount: validCount,
          maxSuccessfulScanCount: validCount,
          ticketStatusSummary: "UNUSED",
        },
      });
      token = issued.token;
    }

    return { paidTickets: tickets.count, validCount, token };
  });

  return NextResponse.json({
    data: {
      order_id: order.id,
      order_code: order.orderCode,
      order_status: "PAID",
      tickets: result.validCount,
      qr_token: result.token,
    },
  });
}
