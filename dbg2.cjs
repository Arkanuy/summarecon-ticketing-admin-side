const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const now = new Date();
  const expired = await p.bookingHold.findMany({ where: { status: "ACTIVE", reservedUntil: { lt: now } }, select: { id: true, eventSeatIds: true } });
  console.log("expired:", expired.length);
  for (const hold of expired) {
    let seatIds = [];
    try { seatIds = JSON.parse(hold.eventSeatIds ?? "[]"); } catch (e) { console.log("parse gagal", e.message); }
    console.log("kursi:", seatIds);
    try {
      await p.$transaction(async (tx) => {
        if (seatIds.length) {
          const u = await tx.eventSeat.updateMany({ where: { id: { in: seatIds }, status: "LOCKED" }, data: { status: "AVAILABLE", statusSource: "HOLD_EXPIRED", currentOrderId: null } });
          console.log("kursi dilepas:", u.count);
        }
        const h = await tx.bookingHold.update({ where: { id: hold.id }, data: { status: "EXPIRED", releasedAt: now, releaseReason: "RESERVED_UNTIL_PASSED" } });
        console.log("hold:", h.status);
      });
    } catch (e) { console.log("ERROR:", e.message); }
  }
  await p.$disconnect();
})();
