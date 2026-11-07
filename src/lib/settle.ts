import { prisma } from "@/lib/db";
import { issueQrToken } from "@/lib/qr/token";

/**
 * Selesaikan order PENDING yang pembayarannya sudah lewat masa bayar.
 *
 * Repo customer side memisahkan "buat order" dan "bayar", tetapi halaman payment-nya
 * hanya mengubah status di localStorage tanpa memanggil API apa pun. Akibatnya order
 * tersimpan PENDING selamanya: tiket tidak terbit, kursi tidak jadi SOLD, QR tidak ada,
 * dan admin hanya melihat "Menunggu pembayaran".
 *
 * Untuk prototipe dengan pembayaran simulasi, order PENDING dianggap lunas begitu
 * melewati ambangnya. Endpoint POST /api/orders/:id/pay tetap jalur utama; fungsi ini
 * hanya jaring pengaman agar data tidak menggantung.
 */

/** Pembayaran simulasi: order PENDING dianggap lunas setelah ambang ini. */
const AUTO_SETTLE_MS = 30 * 1000;

/**
 * Terbitkan e-ticket untuk order PAID yang belum punya QR.
 * Terjadi pada order lama yang selesai sebelum QR otomatis ditambahkan.
 */
export async function backfillMissingTickets(userId?: string): Promise<number> {
  const orders = await prisma.order.findMany({
    where: {
      orderStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
      eTicket: null,
      ...(userId ? { userId } : {}),
    },
    include: { tickets: true },
  });

  let fixed = 0;
  for (const order of orders) {
    const validCount = order.tickets.filter(
      (t) => t.ticketStatus === "ISSUED" || t.ticketStatus === "USED",
    ).length;
    if (validCount === 0) continue;

    const issued = issueQrToken(order.orderCode);
    await prisma.eTicket
      .create({
        data: {
          id: `ETK-${issued.random.slice(0, 10).toUpperCase()}`,
          orderId: order.id,
          eventId: order.eventId,
          qrTokenHash: issued.token,
          issuedAt: order.paidAt ?? new Date(),
          ticketQuantityAtIssue: validCount,
          validTicketCount: validCount,
          maxSuccessfulScanCount: validCount,
          ticketStatusSummary: "UNUSED",
        },
      })
      .catch(() => null);
    fixed++;
  }
  return fixed;
}

export async function settlePendingOrders(userId?: string): Promise<number> {
  await backfillMissingTickets(userId).catch(() => 0);
  const now = new Date();
  const threshold = new Date(now.getTime() - AUTO_SETTLE_MS);

  const pending = await prisma.order.findMany({
    where: {
      orderStatus: "PENDING",
      createdAt: { lt: threshold },
      ...(userId ? { userId } : {}),
    },
    include: { tickets: true, eTicket: true },
  });

  let settled = 0;

  for (const order of pending) {
    /* Jangan sentuh order yang sudah lewat expires_at — itu memang kedaluwarsa. */
    if (order.expiresAt && order.expiresAt < now) continue;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: "PAID", paidAt: now },
      });

      const updated = await tx.ticket.updateMany({
        where: { orderId: order.id, ticketStatus: { in: ["PENDING", "ISSUED"] } },
        data: { ticketStatus: "ISSUED" },
      });

      const seatIds = order.tickets.map((t) => t.eventSeatId).filter((s): s is string => Boolean(s));
      if (seatIds.length) {
        await tx.eventSeat.updateMany({
          where: { id: { in: seatIds }, eventId: order.eventId, status: { in: ["LOCKED", "AVAILABLE"] } },
          data: { status: "SOLD", statusSource: "PAYMENT" },
        });
      }

      await tx.bookingHold.updateMany({
        where: { eventId: order.eventId, userId: order.userId, status: "ACTIVE" },
        data: { status: "CONSUMED", releasedAt: now },
      });

      /* QR wajib terbit saat order jadi PAID; kalau tidak, kartu e-ticket kosong. */
      if (!order.eTicket) {
        const validCount = await tx.ticket.count({
          where: { orderId: order.id, ticketStatus: { in: ["ISSUED", "USED"] } },
        });
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
      }

      if (updated.count > 0) {
        const already = await tx.payment.count({
          where: { orderId: order.id, paymentStatus: "SUCCESS" },
        });
        if (!already) {
          await tx.payment.create({
            data: {
              id: `PAY-${order.id}-AUTO`,
              orderId: order.id,
              provider: "SANDBOX",
              paymentMethod: "QRIS",
              providerTransactionId: `SBX-AUTO-${order.orderCode}`,
              amount: order.totalAmount,
              currency: "IDR",
              paymentStatus: "SUCCESS",
              initiatedAt: order.createdAt,
              paidAt: now,
            },
          });
        }
      }
    });

    settled++;
  }

  return settled;
}
