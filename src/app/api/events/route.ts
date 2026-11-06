import { prisma } from "@/lib/db";
import { ok, paging, pageMeta, parseJsonSafe } from "@/lib/api";

/** GET /api/events?status=&venue_id=&q=&page=&perPage= */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { page, perPage, skip, take } = paging(url);
  const status = url.searchParams.get("status");
  const venueId = url.searchParams.get("venue_id");
  const q = url.searchParams.get("q");

  const where = {
    ...(status ? { eventStatus: status } : {}),
    ...(venueId ? { venueId } : {}),
    ...(q ? { eventName: { contains: q } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      skip,
      take,
      orderBy: { startAt: "desc" },
      include: { venue: true, sections: true, categories: true },
    }),
  ]);

  return ok({
    meta: pageMeta(total, page, perPage),
    items: rows.map((e) => ({
      event_id: e.id,
      event_code: e.eventCode,
      event_name: e.eventName,
      event_status: e.eventStatus,
      venue: { id: e.venue.id, name: e.venue.venueName },
      start_at: e.startAt,
      end_at: e.endAt,
      sales_start_at: e.salesStartAt,
      sales_end_at: e.salesEndAt,
      capacity: e.sections.reduce((s, x) => s + x.capacity, 0),
      sold: e.sections.reduce((s, x) => s + x.soldQuantity, 0),
      categories: e.categories.map((c) => ({ id: c.id, name: c.categoryName, price: c.price, quota: c.quota })),
    })),
  });
}
