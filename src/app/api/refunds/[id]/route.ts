import { prisma } from "@/lib/db";
import { ok, notFound } from "@/lib/api";

/** GET /api/refunds/:id — detail + riwayat status + aksi admin. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const refund = await prisma.refund.findUnique({
    where: { id },
    include: {
      event: true,
      order: true,
      lines: { include: { ticket: true } },
      histories: { orderBy: { changedAt: "asc" } },
      actions: { orderBy: { performedAt: "asc" } },
    },
  });
  if (!refund) return notFound("Refund");

  return ok({
    refund_id: refund.id,
    refund_code: refund.refundCode,
    refund_type: refund.refundType,
    status: refund.status,
    refund_data_status: refund.refundDataStatus,
    amount: refund.refundAmount,
    quantity: refund.quantity,
    event: { id: refund.eventId, name: refund.event.eventName },
    order_id: refund.orderId,
    tickets: refund.lines.map((l) => ({ ticket_id: l.ticketId, participant_name: l.ticket.participantName, amount: l.amount })),
    destination: refund.destMethod
      ? {
          method: refund.destMethod,
          provider_name: refund.destProviderName,
          account_number: refund.destAccountNumber,
          account_holder: refund.destAccountHolder,
          is_dummy: refund.destIsDummy,
        }
      : null,
    manual_transfer: {
      processed_by: refund.manualProcessedBy,
      reference: refund.manualTransferRef,
      date: refund.manualTransferDate,
      proof: refund.manualProofRef,
      note: refund.manualAdminNote,
    },
    timeline: {
      requested_at: refund.requestedAt,
      data_completed_at: refund.dataCompletedAt,
      approved_at: refund.approvedAt,
      rejected_at: refund.rejectedAt,
      processing_started_at: refund.processingStartedAt,
      completed_at: refund.completedAt,
      target_due_at: refund.targetCompletionDueAt,
    },
    histories: refund.histories.map((h) => ({ from: h.fromStatus, to: h.toStatus, at: h.changedAt, by: h.changedBy, reason: h.reason })),
    admin_actions: refund.actions.map((a) => ({ type: a.actionType, by: a.performedBy, at: a.performedAt, result: a.result })),
  });
}
