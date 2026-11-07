import { prisma } from "@/lib/db";

/**
 * Lepas hold yang sudah lewat reserved_until.
 *
 * Tanpa ini kursi LOCKED tidak pernah kembali AVAILABLE: peserta yang membatalkan
 * checkout meninggalkan kursi terkunci selamanya, dan orang lain tidak bisa memesannya.
 *
 * Aman dipanggil berkali-kali (idempoten): hanya menyentuh hold ACTIVE yang kedaluwarsa.
 */
export async function releaseExpiredHolds(eventId?: string): Promise<number> {
  const now = new Date();

  const expired = await prisma.bookingHold.findMany({
    where: {
      status: "ACTIVE",
      reservedUntil: { lt: now },
      ...(eventId ? { eventId } : {}),
    },
    select: { id: true, eventSeatIds: true },
  });

  if (expired.length === 0) return 0;

  let released = 0;
  for (const hold of expired) {
    let seatIds: string[] = [];
    try {
      seatIds = JSON.parse(hold.eventSeatIds ?? "[]") as string[];
    } catch {
      seatIds = [];
    }

    await prisma.$transaction(async (tx) => {
      /* Kursi hanya dilepas kalau masih LOCKED (belum jadi SOLD oleh order lain). */
      if (seatIds.length) {
        await tx.eventSeat.updateMany({
          where: { id: { in: seatIds }, status: "LOCKED" },
          data: { status: "AVAILABLE", statusSource: "HOLD_EXPIRED", currentOrderId: null },
        });
      }
      await tx.bookingHold.update({
        where: { id: hold.id },
        data: { status: "EXPIRED", releasedAt: now, releaseReason: "RESERVED_UNTIL_PASSED" },
      });
    });

    released++;
  }

  return released;
}
