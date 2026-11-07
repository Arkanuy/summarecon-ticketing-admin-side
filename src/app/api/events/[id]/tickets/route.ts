import { prisma } from "@/lib/db";
import { ok, notFound, paging, pageMeta } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";

/**
 * GET /api/events/:id/tickets
 * Filter untuk hari-H: cari tiket lewat kode/ID, saring status tiket & status check-in.
 * Query: q, status, attendance, category_id, section_id, page, perPage
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id: eventId } = await params;
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return notFound("Event");

  const url = new URL(request.url);
  const { page, perPage, skip, take } = paging(url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const attendance = url.searchParams.get("attendance");
  const categoryId = url.searchParams.get("category_id");

  const where = {
    eventId,
    ...(status ? { ticketStatus: status } : {}),
    ...(attendance ? { attendanceStatus: attendance } : {}),
    ...(categoryId ? { orderItem: { ticketCategoryId: categoryId } } : {}),
    ...(q
      ? {
          OR: [
            { ticketCode: { contains: q } },
            { id: { contains: q } },
            { participantName: { contains: q } },
            { orderId: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      skip,
      take,
      orderBy: [{ attendeeSequence: "asc" }],
      include: { seat: true, section: true, orderItem: { include: { category: true } } },
    }),
  ]);

  return ok({
    meta: pageMeta(total, page, perPage),
    items: rows.map((t) => ({
      ticket_id: t.id,
      ticket_code: t.ticketCode,
      participant_name: t.participantName,
      order_id: t.orderId,
      seat: t.seat?.seatLabel ?? null,
      section: t.section?.sectionName ?? null,
      category: t.orderItem?.category?.categoryName ?? null,
      ticket_status: t.ticketStatus,
      attendance_status: t.attendanceStatus,
    })),
  });
}
