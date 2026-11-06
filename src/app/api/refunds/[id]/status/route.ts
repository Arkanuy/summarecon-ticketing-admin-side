import { prisma } from "@/lib/db";
import { ok, badRequest, conflict, notFound } from "@/lib/api";

/** Transisi yang sah — menjaga agar admin tidak melompati persetujuan (§6.4). */
const ALLOWED: Record<string, string[]> = {
  REQUESTED: ["NEED_CONFIRMATION", "UNDER_REVIEW", "APPROVED"],
  NEED_CONFIRMATION: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "NEED_CONFIRMATION"],
  APPROVED: ["PROCESSING", "REJECTED"],
  PROCESSING: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
};

/**
 * PATCH /api/refunds/:id/status
 * Body: { to_status, actor_user_id, reason?, destination?, manual_transfer? }
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const toStatus = body?.to_status as string | undefined;
  if (!toStatus) return badRequest("to_status wajib diisi");

  const refund = await prisma.refund.findUnique({ where: { id }, include: { lines: true } });
  if (!refund) return notFound("Refund");

  const allowed = ALLOWED[refund.status] ?? [];
  if (!allowed.includes(toStatus)) {
    return conflict(`Tidak boleh pindah dari ${refund.status} ke ${toStatus}`, { allowed });
  }

  const now = new Date();
  const data: Record<string, unknown> = { status: toStatus };
  if (toStatus === "APPROVED") data.approvedAt = now;
  if (toStatus === "REJECTED") data.rejectedAt = now;
  if (toStatus === "PROCESSING") data.processingStartedAt = now;
  if (toStatus === "COMPLETED") data.completedAt = now;
  if (body?.destination) {
    const d = body.destination;
    data.destMethod = d.method ?? null;
    data.destProviderName = d.provider_name ?? null;
    data.destAccountNumber = d.account_number ?? null;
    data.destAccountHolder = d.account_holder_name ?? null;
    data.destIsDummy = d.is_dummy ?? true;
    data.refundDataStatus = d.account_number && d.account_holder_name ? "COMPLETE" : "NEED_CORRECTION";
    if (data.refundDataStatus === "COMPLETE") data.dataCompletedAt = now;
  }
  if (body?.manual_transfer) {
    const m = body.manual_transfer;
    data.manualProcessedBy = m.processed_by ?? null;
    data.manualTransferRef = m.transfer_reference ?? null;
    data.manualTransferDate = m.transfer_date ? new Date(m.transfer_date) : null;
    data.manualProofRef = m.proof_reference ?? null;
    data.manualAdminNote = m.admin_note ?? null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.refund.update({ where: { id }, data });

    await tx.refundStatusHistory.create({
      data: {
        id: `RFH-${Date.now().toString(36).toUpperCase()}`,
        refundId: id,
        fromStatus: refund.status,
        toStatus,
        changedAt: now,
        changedBy: body?.actor_user_id ?? null,
        reason: body?.reason ?? null,
      },
    });

    await tx.refundAdminAction.create({
      data: {
        id: `RFA-${Date.now().toString(36).toUpperCase()}`,
        refundId: id,
        actionType: toStatus,
        performedBy: body?.actor_user_id ?? null,
        performedAt: now,
        result: toStatus,
        note: body?.reason ?? null,
      },
    });

    // Tiket dinonaktifkan saat refund selesai (§6.4 no.14).
    if (toStatus === "COMPLETED") {
      const ticketIds = refund.lines.map((l) => l.ticketId);
      await tx.ticket.updateMany({ where: { id: { in: ticketIds } }, data: { ticketStatus: "REFUNDED", invalidatedAt: now } });
      for (const ticketId of ticketIds) {
        await tx.eventSeat.updateMany({ where: { tickets: { some: { id: ticketId } } }, data: { status: "AVAILABLE" } });
      }
    }

    return updated;
  });

  return ok({ refund_id: result.id, from: refund.status, to: result.status, changed_at: result.approvedAt ?? result.completedAt ?? now });
}
