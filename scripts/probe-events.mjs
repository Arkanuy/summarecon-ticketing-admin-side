import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const ev = await p.event.findMany({
  select: { id: true, eventCode: true, eventName: true, eventStatus: true, publishedAt: true, salesStartAt: true, salesEndAt: true },
  orderBy: { startAt: 'desc' },
});
console.log('=== EVENTS ===');
for (const e of ev) {
  console.log(`${e.eventCode} | ${e.eventStatus} | publishedAt=${e.publishedAt?.toISOString() ?? 'null'} | sales=${e.salesStartAt?.toISOString() ?? '-'}..${e.salesEndAt?.toISOString() ?? '-'} | ${e.eventName}`);
}
console.log('total', ev.length);
const seats = await p.eventSeat.count();
const orders = await p.order.count();
const tickets = await p.ticket.count();
console.log({ seats, orders, tickets });
await p.$disconnect();
