import { prisma } from "@/lib/db";
import { ok, badRequest, fail, notFound } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";
import { resolveQrToken } from "@/lib/qr/resolve";

/**
 * POST /api/checkin — scan QR order (§8.6).
 * Body: { qr_token_hash, event_id, officer_user_id?, device_id? }
 *
 * Aturan: scan diterima selama successful_scan_count < jumlah tiket valid.
 * Ada unique(e_ticket_id, scan_sequence) sehingga dua petugas tidak bisa menulis nomor urut sama.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  const qrHash = body?.qr_token_hash as string | undefined;
  const eventId = body?.event_id as string | undefined;
  if (!qrHash) return badRequest("qr_token_hash wajib diisi");

  const resolved = await resolveQrToken(qrHash);
  if (!resolved.ok) return fail(422, resolved.code, `Tidak valid: ${resolved.message}`);
  const eTicket = resolved.eTicket;
  if (eventId && eTicket.eventId !== eventId) return fail(422, "EVENT_TIDAK_COCOK", "Tidak valid: tiket untuk event lain");

  /* Tiket valid untuk check-in = ISSUED atau USED (USED sudah terpakai, tapi tetap bagian kuota QR).
     REFUNDED / CANCELLED mengurangi kuota (§8.6). */
  const validTickets = eTicket.order.tickets.filter((t) => t.ticketStatus === "ISSUED" || t.ticketStatus === "USED");
  const used = eTicket.successfulScanCount;
  const nextTicket = validTickets.find((t) => t.ticketStatus === "ISSUED");

  if (!nextTicket || used >= validTickets.length) {
    const attempt = used + 1;
    await prisma.checkinRecord
      .create({
        data: {
          id: `CHK-${Date.now().toString(36).toUpperCase()}`,
          eTicketId: eTicket.id,
          orderId: eTicket.orderId,
          ticketId: null,
          eventId: eTicket.eventId,
          scanSequence: attempt,
          scanResult: "REJECTED_LIMIT",
          scannedAt: new Date(),
          checkedBy: body?.officer_user_id ?? null,
          deviceId: body?.device_id ?? null,
          rejectionReason: "MAX_SCAN_REACHED",
        },
      })
      .catch(() => null); // sequence bentrok = sudah tercatat proses lain
    return fail(409, "BATAS_SCAN", `Sudah digunakan: ${used}/${validTickets.length}`, { scan: `${used}/${validTickets.length}` });
  }

  const ticket = nextTicket;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Guard: hanya naikkan kalau hitungan belum berubah (optimistic concurrency).
      const updated = await tx.eTicket.updateMany({
        where: { id: eTicket.id, successfulScanCount: used },
        data: { successfulScanCount: used + 1, ticketStatusSummary: used + 1 >= validTickets.length ? "FULLY_USED" : "PARTIALLY_USED" },
      });
      if (updated.count !== 1) throw new Error("SCAN_RACE");

      await tx.ticket.update({ where: { id: ticket.id }, data: { ticketStatus: "USED", attendanceStatus: "CHECKED_IN" } });

      return tx.checkinRecord.create({
        data: {
          id: `CHK-${Date.now().toString(36).toUpperCase()}`,
          eTicketId: eTicket.id,
          orderId: eTicket.orderId,
          ticketId: ticket.id,
          eventId: eTicket.eventId,
          scanSequence: used + 1,
          scanResult: "SUCCESS",
          scannedAt: new Date(),
          checkedBy: body?.officer_user_id ?? null,
          deviceId: body?.device_id ?? null,
        },
      });
    });

    return ok({
      result: "VALID",
      checkin_id: result.id,
      ticket: { ticket_id: ticket.id, participant_name: ticket.participantName },
      scan: `${used + 1}/${validTickets.length}`,
    });
  } catch (error) {
    if ((error as Error).message === "SCAN_RACE") {
      return fail(409, "SCAN_BERSAMAAN", "QR sedang dipindai petugas lain, ulangi scan");
    }
    throw error;
  }
}

/** GET /api/checkin?event_id= — riwayat scan. */
export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("event_id");
  const records = await prisma.checkinRecord.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { scannedAt: "desc" },
    take: 100,
    include: { ticket: true },
  });
  return ok(
    records.map((r) => ({
      checkin_id: r.id,
      order_id: r.orderId,
      ticket_id: r.ticketId,
      participant_name: r.ticket?.participantName ?? null,
      scan_sequence: r.scanSequence,
      scan_result: r.scanResult,
      scanned_at: r.scannedAt,
      rejection_reason: r.rejectionReason,
    })),
  );
}
