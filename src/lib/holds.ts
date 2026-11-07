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

  /* ACTIVE yang lewat waktu, DAN hold RELEASED yang kursinya tertinggal LOCKED.
     Kasus kedua muncul saat pelepasan lama tidak menyentuh kursinya. */
  const expired = await prisma.bookingHold.findMany({
    where: {
      OR: [
        { status: "ACTIVE", reservedUntil: { lt: now } },
        { status: "RELEASED" },
      ],
      ...(eventId ? { eventId } : {}),
    },
    select: { id: true, eventSeatIds: true, status: true },
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
      if (hold.status === "ACTIVE") {
        await tx.bookingHold.update({
          where: { id: hold.id },
          data: { status: "EXPIRED", releasedAt: now, releaseReason: "RESERVED_UNTIL_PASSED" },
        });
      }
    });

    released++;
  }

  return released;
}
