const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const now = new Date();
  console.log("now:", now.toISOString());
  const all = await p.bookingHold.findMany({ where: { status: "ACTIVE" } });
  console.log("ACTIVE:", all.length);
  for (const h of all) {
    const past = h.reservedUntil && h.reservedUntil < now;
    console.log(" ", h.id, "| until:", h.reservedUntil && h.reservedUntil.toISOString(), "| kedaluwarsa:", past, "| kursi:", h.eventSeatIds);
  }
  await p.$disconnect();
})();
