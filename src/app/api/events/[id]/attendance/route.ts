import { prisma } from "@/lib/db";
import { ok, notFound } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";

/** GET /api/events/:id/attendance — hitungan untuk memantau check-in hari-H. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return notFound("Event");

  const [byStatus, byAttendance, qr] = await Promise.all([
    prisma.ticket.groupBy({ by: ["ticketStatus"], where: { eventId }, _count: true }),
    prisma.ticket.groupBy({ by: ["attendanceStatus"], where: { eventId }, _count: true }),
    prisma.eTicket.aggregate({
      where: { eventId },
      _sum: { validTicketCount: true, successfulScanCount: true },
      _count: true,
    }),
  ]);

  const issued = byStatus.find((s) => s.ticketStatus === "ISSUED")?._count ?? 0;
  const used = byStatus.find((s) => s.ticketStatus === "USED")?._count ?? 0;
  const checkedIn = byAttendance.find((a) => a.attendanceStatus === "CHECKED_IN")?._count ?? 0;

  return ok({
    event_id: eventId,
    tickets: Object.fromEntries(byStatus.map((s) => [s.ticketStatus, s._count])),
    attendance: Object.fromEntries(byAttendance.map((a) => [a.attendanceStatus, a._count])),
    qr_issued: qr._count,
    scans_used: qr._sum.successfulScanCount ?? 0,
    scan_quota: qr._sum.validTicketCount ?? 0,
    belum_check_in: issued,
    sudah_check_in: checkedIn > used ? checkedIn : used,
  });
}
