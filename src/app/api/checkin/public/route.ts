import { prisma } from "@/lib/db";
import { ok, badRequest, fail } from "@/lib/api";
import { scanAuthorized, unauthorized } from "@/lib/auth/scan";

/**
 * POST /api/checkin/public — check-in untuk perangkat petugas.
 * Auth: header x-scan-code (bukan sesi admin). Logika scan identik dengan /api/checkin.
 */
export async function POST(request: Request) {
  if (!scanAuthorized(request)) return unauthorized();

  const body = await request.json().catch(() => null);
  const qrHash = body?.qr_token_hash as string | undefined;
  const eventId = body?.event_id as string | undefined;
  if (!qrHash) return badRequest("qr_token_hash wajib diisi");

  const eTicket = await prisma.eTicket.findUnique({
    where: { qrTokenHash: qrHash },
    include: { order: { include: { tickets: true } }, event: true },
  });
  if (!eTicket) return fail(422, "QR_TIDAK_DIKENAL", "Bukan tiket event ini");
  if (eventId && eTicket.eventId !== eventId) return fail(422, "EVENT_TIDAK_COCOK", "Tiket untuk event lain");
  if (eTicket.invalidatedAt) return fail(422, "QR_DINONAKTIFKAN", "Tiket sudah dibatalkan atau direfund");

  const valid = eTicket.order.tickets.filter((t) => t.ticketStatus === "ISSUED" || t.ticketStatus === "USED");
  const used = eTicket.successfulScanCount;
  const nextTicket = valid.filter((t) => t.ticketStatus === "ISSUED")[0];

  if (!nextTicket || used >= valid.length) {
    await prisma.checkinRecord
      .create({
        data: {
          id: `CHK-${Date.now().toString(36).toUpperCase()}`,
          eTicketId: eTicket.id,
          orderId: eTicket.orderId,
          ticketId: null,
          eventId: eTicket.eventId,
          scanSequence: used + 1,
          scanResult: "REJECTED_LIMIT",
          scannedAt: new Date(),
          deviceId: body?.device_id ?? null,
          rejectionReason: "MAX_SCAN_REACHED",
        },
      })
      .catch(() => null);
    return fail(409, "BATAS_SCAN", `Sudah digunakan: ${used}/${valid.length}`, {
      scan: `${used}/${valid.length}`,
      event_name: eTicket.event.eventName,
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.eTicket.updateMany({
        where: { id: eTicket.id, successfulScanCount: used },
        data: {
          successfulScanCount: used + 1,
          ticketStatusSummary: used + 1 >= valid.length ? "FULLY_USED" : "PARTIALLY_USED",
        },
      });
      if (updated.count !== 1) throw new Error("SCAN_RACE");

      await tx.ticket.update({
        where: { id: nextTicket.id },
        data: { ticketStatus: "USED", attendanceStatus: "CHECKED_IN" },
      });

      return tx.checkinRecord.create({
        data: {
          id: `CHK-${Date.now().toString(36).toUpperCase()}`,
          eTicketId: eTicket.id,
          orderId: eTicket.orderId,
          ticketId: nextTicket.id,
          eventId: eTicket.eventId,
          scanSequence: used + 1,
          scanResult: "SUCCESS",
          scannedAt: new Date(),
          deviceId: body?.device_id ?? null,
        },
      });
    });

    return ok({
      result: "VALID",
      checkin_id: result.id,
      ticket: { ticket_id: nextTicket.id, participant_name: nextTicket.participantName },
      scan: `${used + 1}/${valid.length}`,
      remaining: valid.length - (used + 1),
      event_name: eTicket.event.eventName,
    });
  } catch (error) {
    if ((error as Error).message === "SCAN_RACE") {
      return fail(409, "SCAN_BERSAMAAN", "QR sedang dipindai petugas lain, ulangi");
    }
    throw error;
  }
}

/** GET /api/checkin/public?event_id= — daftar event untuk pemilih di perangkat. */
export async function GET(request: Request) {
  if (!scanAuthorized(request)) return unauthorized();
  const events = await prisma.event.findMany({
    where: { eventStatus: { in: ["SALES_OPEN", "ONGOING", "PUBLISHED"] } },
    orderBy: { startAt: "desc" },
    select: { id: true, eventName: true, startAt: true },
  });
  return ok(events.map((e) => ({ event_id: e.id, event_name: e.eventName, start_at: e.startAt })));
}
