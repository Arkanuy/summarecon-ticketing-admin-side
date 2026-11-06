import { prisma } from "@/lib/db";
import { ok, notFound, parseJsonSafe } from "@/lib/api";

/** GET /api/events/:id/seats?status=&section_id= — denah kursi untuk BOOK_BY_SEAT. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const sectionId = url.searchParams.get("section_id");

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return notFound("Event");

  const seats = await prisma.eventSeat.findMany({
    where: { eventId, ...(status ? { status } : {}), ...(sectionId ? { sectionId } : {}) },
    orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }],
  });

  return ok(
    seats.map((s) => ({
      event_seat_id: s.id,
      section_id: s.sectionId,
      block_code: s.blockCode,
      row_label: s.rowLabel,
      seat_number: s.seatNumber,
      seat_label: s.seatLabel,
      position: parseJsonSafe<unknown>(s.position, null),
      status: s.status,
      current_order_id: s.currentOrderId,
    })),
  );
}
