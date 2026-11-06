import { prisma } from "@/lib/db";
import { ok, badRequest, conflict, notFound } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";

/**
 * POST /api/events/:id/seats/block — blokir kursi operasional (§6.2 no.14–16).
 * Body: { event_seat_ids: string[], reason, blocked_by }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id: eventId } = await params;
  const body = await request.json().catch(() => null);
  const seatIds: string[] = Array.isArray(body?.event_seat_ids) ? body.event_seat_ids : [];
  if (!seatIds.length) return badRequest("event_seat_ids wajib diisi");

  const seats = await prisma.eventSeat.findMany({ where: { id: { in: seatIds }, eventId }, select: { id: true, status: true } });
  if (seats.length !== seatIds.length) return notFound("Kursi");

  // Kursi terjual atau sedang ditahan tidak boleh diblokir.
  const notBlockable = seats.filter((s) => s.status !== "AVAILABLE" && s.status !== "BLOCKED");
  if (notBlockable.length) {
    return conflict("Sebagian kursi sudah terjual atau ditahan", { event_seat_ids: notBlockable.map((s) => s.id) });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.eventSeat.updateMany({ where: { id: { in: seatIds }, eventId }, data: { status: "BLOCKED", version: { increment: 1 } } });
    const blocks = await Promise.all(
      seatIds.map((seatId, i) =>
        tx.seatBlock.create({
          data: {
            id: `BLK-${Date.now().toString(36).toUpperCase()}-${i}`,
            eventId,
            eventSeatId: seatId,
            reason: body?.reason ?? null,
            blockedBy: body?.blocked_by ?? null,
            blockedAt: new Date(),
            status: "ACTIVE",
          },
        }),
      ),
    );
    return blocks;
  });

  return ok({ blocked: result.length, event_seat_ids: result.map((b) => b.eventSeatId) }, { status: 201 });
}

/** DELETE /api/events/:id/seats/block?seat_id= — lepas blokir. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id: eventId } = await params;
  const seatId = new URL(request.url).searchParams.get("seat_id");
  if (!seatId) return badRequest("seat_id wajib diisi");

  const active = await prisma.seatBlock.findFirst({ where: { eventId, eventSeatId: seatId, status: "ACTIVE" } });
  if (!active) return notFound("Blokir kursi");

  await prisma.$transaction([
    prisma.seatBlock.updateMany({ where: { eventId, eventSeatId: seatId, status: "ACTIVE" }, data: { status: "RELEASED" } }),
    prisma.eventSeat.updateMany({ where: { id: seatId, eventId, status: "BLOCKED" }, data: { status: "AVAILABLE", version: { increment: 1 } } }),
  ]);

  return ok({ event_seat_id: seatId, status: "AVAILABLE" });
}
