import { prisma } from "@/lib/db";
import { ok, badRequest, fail } from "@/lib/api";

/**
 * POST /api/payments/callback — callback sandbox gateway (§6.3 no.3–4).
 * Idempoten: provider_event_id yang sama tidak diproses dua kali.
 * Body: { payment_id, provider_event_id, event_type, signature, payload? }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const paymentId = body?.payment_id as string | undefined;
  const providerEventId = body?.provider_event_id as string | undefined;
  const eventType = body?.event_type as string | undefined;

  if (!paymentId || !providerEventId || !eventType) return badRequest("payment_id, provider_event_id, event_type wajib diisi");

  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment) return fail(404, "NOT_FOUND", "Payment tidak ditemukan");

  // Signature dummy: sandbox memakai header x-sandbox-signature = "valid".
  const signatureValid = body?.signature === "valid";

  const existing = await prisma.paymentGatewayCallback.findUnique({ where: { providerEventId } });
  if (existing) {
    return ok({ status: "DUPLICATE_IGNORED", callback_id: existing.id, processing_result: existing.processingResult });
  }

  if (!signatureValid) {
    const rejected = await prisma.paymentGatewayCallback.create({
      data: {
        id: `CB-${Date.now().toString(36).toUpperCase()}`,
        paymentId,
        providerEventId,
        eventType,
        receivedAt: new Date(),
        signatureValid: false,
        idempotencyKey: providerEventId,
        processingResult: "REJECTED_SIGNATURE",
      },
    });
    return fail(400, "SIGNATURE_INVALID", "Signature callback tidak valid", { callback_id: rejected.id });
  }

  const result = await prisma.$transaction(async (tx) => {
    const cb = await tx.paymentGatewayCallback.create({
      data: {
        id: `CB-${Date.now().toString(36).toUpperCase()}`,
        paymentId,
        providerEventId,
        eventType,
        receivedAt: new Date(),
        signatureValid: true,
        idempotencyKey: providerEventId,
        processingResult: "PROCESSED",
      },
    });

    if (eventType === "PAYMENT_SUCCESS") {
      const now = new Date();
      await tx.payment.update({ where: { id: paymentId }, data: { paymentStatus: "SUCCESS", paidAt: now } });
      await tx.order.update({ where: { id: payment.orderId }, data: { orderStatus: "PAID", paidAt: now } });

      // Terbitkan tiket + satu QR per order kalau belum ada.
      const tickets = await tx.ticket.findMany({ where: { orderId: payment.orderId } });
      await tx.ticket.updateMany({ where: { orderId: payment.orderId, ticketStatus: "RESERVED" }, data: { ticketStatus: "ISSUED", issuedAt: now } });

      const existingETicket = await tx.eTicket.findUnique({ where: { orderId: payment.orderId } });
      if (!existingETicket) {
        const valid = tickets.filter((t) => t.ticketStatus !== "CANCELLED").length || tickets.length;
        await tx.eTicket.create({
          data: {
            id: `ETK-${Date.now().toString(36).toUpperCase()}`,
            orderId: payment.orderId,
            eventId: payment.order.eventId,
            qrTokenHash: `QR-${payment.orderId}-${Date.now().toString(36).toUpperCase()}`,
            issuedAt: now,
            ticketQuantityAtIssue: valid,
            validTicketCount: valid,
            maxSuccessfulScanCount: valid,
            ticketStatusSummary: "UNUSED",
          },
        });
      }
    }

    if (eventType === "PAYMENT_FAILED" || eventType === "PAYMENT_EXPIRED") {
      await tx.payment.update({ where: { id: paymentId }, data: { paymentStatus: eventType === "PAYMENT_FAILED" ? "FAILED" : "EXPIRED" } });
      await tx.order.update({ where: { id: payment.orderId }, data: { orderStatus: eventType === "PAYMENT_FAILED" ? "CANCELLED" : "EXPIRED" } });
    }

    return cb;
  });

  return ok({ status: "PROCESSED", callback_id: result.id, event_type: eventType });
}
