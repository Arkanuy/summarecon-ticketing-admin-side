import { prisma } from "@/lib/db";
import { ok, fail, notFound } from "@/lib/api";
import { requireCustomer } from "@/lib/auth/guard";
import { issueQrToken } from "@/lib/qr/token";
import { settlePendingOrders } from "@/lib/settle";
import QRCode from "qrcode";

/**
 * GET /api/customer/orders/:id/qr
 * Menerbitkan (sekali) atau mengambil token QR untuk order milik peserta.
 * ?format=png  -> gambar PNG siap tampil/cetak
 * default      -> JSON { token, data_url, ... }
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCustomer(request);
  if ("response" in guard) return guard.response;
  const { user } = guard;

  const { id } = await params;

  /* Halaman e-ticket dibuka tepat setelah "bayar"; pastikan order PENDING selesai dulu. */
  await settlePendingOrders(user.userId).catch(() => 0);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { event: true, tickets: true, eTicket: true },
  });

  if (!order || order.userId !== user.userId) return notFound("Order");
  if (order.orderStatus !== "PAID" && !order.orderStatus.includes("REFUND")) {
    return fail(409, "ORDER_BELUM_DIBAYAR", "QR terbit setelah pembayaran berhasil", { order_status: order.orderStatus });
  }

  let eTicket = order.eTicket;
  if (!eTicket) {
    const valid = order.tickets.filter((t) => t.ticketStatus !== "CANCELLED").length || order.tickets.length;
    const { token, random } = issueQrToken(order.orderCode);
    eTicket = await prisma.eTicket.create({
      data: {
        id: `ETK-${random.slice(0, 10).toUpperCase()}`,
        orderId: order.id,
        eventId: order.eventId,
        qrTokenHash: token,
        issuedAt: new Date(),
        ticketQuantityAtIssue: valid,
        validTicketCount: valid,
        maxSuccessfulScanCount: valid,
        ticketStatusSummary: "UNUSED",
      },
    });
  }

  const validCount = eTicket.validTicketCount;
  const used = eTicket.successfulScanCount;
  const payload = {
    order_id: order.id,
    order_code: order.orderCode,
    event_name: order.event.eventName,
    event_start_at: order.event.startAt,
    token: eTicket.qrTokenHash,
    valid_ticket_count: validCount,
    successful_scan_count: used,
    remaining: Math.max(0, validCount - used),
    exhausted: used >= validCount,
    participants: order.tickets.map((t) => ({ ticket_id: t.id, name: t.participantName, status: t.ticketStatus })),
  };

  if (new URL(request.url).searchParams.get("format") === "png") {
    const png = await QRCode.toBuffer(eTicket.qrTokenHash, {
      type: "png",
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#2A1F2D", light: "#FFFFFF" },
    });
    return new Response(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  }

  const dataUrl = await QRCode.toDataURL(eTicket.qrTokenHash, {
    width: 720,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#2A1F2D", light: "#FFFFFF" },
  });

  return ok({ ...payload, data_url: dataUrl });
}
