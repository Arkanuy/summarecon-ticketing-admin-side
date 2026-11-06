import { prisma } from "@/lib/db";
import { ok } from "@/lib/api";

/** GET /api/reports/sales?event_id= — penjualan per kategori. */
export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("event_id");

  const categories = await prisma.ticketCategory.findMany({
    where: eventId ? { eventId } : {},
    include: { event: true, sections: true },
    orderBy: [{ eventId: "asc" }, { price: "asc" }],
  });

  const items = categories.map((c) => {
    const sold = c.sections.reduce((s, x) => s + x.soldQuantity, 0);
    return {
      event_id: c.eventId,
      event_name: c.event.eventName,
      category: c.categoryName,
      price: c.price,
      quota: c.quota,
      sold,
      remaining: Math.max(0, c.quota - sold),
      revenue: sold * c.price,
    };
  });

  return ok({ total_revenue: items.reduce((s, i) => s + i.revenue, 0), items });
}
