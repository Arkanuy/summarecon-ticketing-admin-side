const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const now = new Date();
  const a = await p.bookingHold.findMany({ where: { status: "ACTIVE", reservedUntil: { lt: now } } });
  console.log("lt Date ->", a.length);
  const b = await p.bookingHold.findMany({ where: { status: "ACTIVE", reservedUntil: { lt: now.toISOString() } } });
  console.log("lt ISO  ->", b.length);
  const all = await p.bookingHold.findMany({ where: { status: "ACTIVE" } });
  const t = all[0] && all[0].reservedUntil;
  console.log("tipe reservedUntil:", typeof t, t instanceof Date ? "Date" : "BUKAN Date", "| nilai:", t);
  await p.$disconnect();
})();
