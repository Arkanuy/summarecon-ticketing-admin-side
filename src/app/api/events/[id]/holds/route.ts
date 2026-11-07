import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, badRequest } from "@/lib/api";
import { requireAdmin, requireCustomer } from "@/lib/auth/guard";
import { releaseExpiredHolds } from "@/lib/holds";

/**
 * POST /api/events/:id/holds — kunci kursi 10 menit.
 * Body: { user_id, event_seat_ids: string[], section_id?: string, quantity?: number }
 *
 * Atomik: updateMany hanya menyentuh kursi yang benar-benar AVAILABLE.
 * Kalau jumlah baris terpengaruh kurang dari yang diminta, seluruh transaksi dibatalkan (409).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireCustomer(request);
  if ("response" in guard) return guard.response;

  const { id: eventId } = await params;
  const body = await request.json().catch(() => null);
  const seatIds: string[] = Array.isArray(body?.event_seat_ids) ? body.event_seat_ids : [];

  /* Bersihkan hold yang sudah kedaluwarsa supaya kursinya bisa diklaim lagi. */
  await releaseExpiredHolds(eventId).catch(() => 0);
  /* user_id diambil dari sesi; body.user_id hanya untuk kompatibilitas klien lama. */
  const userId = (body?.user_id as string | undefined) ?? guard.user.userId;

  if (!seatIds.length) return badRequest("event_seat_ids minimal satu kursi");

  const holdMinutes = Number(
    (await prisma.systemSetting.findUnique({ where: { key: "booking.seat_lock_duration_minutes" } }))?.value ?? 10,
  );

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil kursi yang statusnya masih AVAILABLE dan milik event ini.
      const available = await tx.eventSeat.findMany({
        where: { id: { in: seatIds }, eventId, status: "AVAILABLE" },
        select: { id: true, sectionId: true },
      });

      if (available.length !== seatIds.length) {
        const taken = seatIds.filter((s) => !available.some((a) => a.id === s));
        throw Object.assign(new Error("SEAT_UNAVAILABLE"), { taken });
      }

      // 2. Kunci kursi dengan syarat status masih AVAILABLE (guard optimistik).
      const updated = await tx.eventSeat.updateMany({
        where: { id: { in: seatIds }, eventId, status: "AVAILABLE" },
        data: { status: "LOCKED", version: { increment: 1 } },
      });
      if (updated.count !== seatIds.length) throw new Error("SEAT_RACE");

      // 3. Catat hold.
      const now = new Date();
      const hold = await tx.bookingHold.create({
        data: {
          id: `HLD-${Date.now().toString(36).toUpperCase()}`,
          eventId,
          userId,
          eventSeatIds: JSON.stringify(seatIds),
          sectionId: available[0]?.sectionId ?? null,
          quantity: body?.quantity ?? seatIds.length,
          holdStartedAt: now,
          reservedUntil: new Date(now.getTime() + holdMinutes * 60 * 1000),
          status: "ACTIVE",
        },
      });

      // 4. Naikkan reserved_quantity section agar kuota ikut terhitung.
      const sections = [...new Set(available.map((a) => a.sectionId))];
      for (const sectionId of sections) {
        await tx.eventSection.update({
          where: { id: sectionId },
          data: { reservedQuantity: { increment: available.filter((a) => a.sectionId === sectionId).length } },
        });
      }

      return hold;
    });

    return ok({ hold_id: result.id, event_seat_ids: seatIds, reserved_until: result.reservedUntil, status: result.status }, { status: 201 });
  } catch (error) {
    const err = error as Error & { taken?: string[] };
    if (err.message === "SEAT_UNAVAILABLE") {
      return fail(409, "SEAT_UNAVAILABLE", "Sebagian kursi sudah tidak tersedia", { taken: err.taken });
    }
    if (err.message === "SEAT_RACE") {
      return fail(409, "SEAT_RACE", "Kursi baru saja diambil pengguna lain, coba pilih ulang");
    }
    return NextResponse.json({ error: { code: "HOLD_FAILED", message: "Gagal mengunci kursi" } }, { status: 500 });
  }
}

/** GET /api/events/:id/holds — daftar hold aktif untuk event. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(_request);
  if ("response" in guard) return guard.response;

  const { id: eventId } = await params;
  const holds = await prisma.bookingHold.findMany({
    where: { eventId, status: "ACTIVE" },
    orderBy: { holdStartedAt: "desc" },
  });
  return ok(
    holds.map((h) => ({
      hold_id: h.id,
      user_id: h.userId,
      event_seat_ids: JSON.parse(h.eventSeatIds ?? "[]"),
      reserved_until: h.reservedUntil,
      status: h.status,
    })),
  );
}
