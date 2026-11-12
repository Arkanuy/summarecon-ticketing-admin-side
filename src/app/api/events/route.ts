import { prisma } from "@/lib/db";
import { ok, created, badRequest, paging, pageMeta } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";

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

/**
 * POST /api/events — buat event baru (§9 no.3). Selalu masuk sebagai DRAFT.
 * Body: { event_name, venue_id, layout_template_id?, start_at, end_at,
 *         sales_start_at, sales_end_at, categories: [{name, price, quota}] }
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Body JSON tidak valid");

  const name = String(body.event_name ?? "").trim();
  const venueId = String(body.venue_id ?? "").trim();
  if (!name) return badRequest("event_name wajib diisi");
  if (!venueId) return badRequest("venue_id wajib diisi");

  const parseDate = (v: unknown) => {
    if (!v) return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const startAt = parseDate(body.start_at);
  const endAt = parseDate(body.end_at) ?? startAt;
  const salesStart = parseDate(body.sales_start_at);
  const salesEnd = parseDate(body.sales_end_at);
  if (!startAt) return badRequest("start_at wajib dan harus tanggal valid");

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) return badRequest("Venue tidak ditemukan");
  if (venue.status !== "ACTIVE") return badRequest(`Venue ${venue.venueName} sedang nonaktif`);

  const template = body.layout_template_id
    ? await prisma.layoutTemplate.findFirst({ where: { id: String(body.layout_template_id), venueId } })
    : await prisma.layoutTemplate.findFirst({ where: { venueId } });
  if (!template) return badRequest("Venue ini belum punya layout template");

  type CategoryInput = { name: string; price: number; quota: number; section_name?: string };
  const categories: CategoryInput[] = Array.isArray(body.categories)
    ? body.categories
        .map((c: Record<string, unknown>) => ({
          name: String(c?.name ?? "").trim(),
          price: Number(c?.price ?? 0),
          quota: Number(c?.quota ?? 0),
          section_name: c?.section_name ? String(c.section_name) : undefined,
        }))
        .filter((c: CategoryInput) => c.name)
    : [];

  /* Kode event: EVT-<venueCode>-<urut> */
  const seq = (await prisma.event.count({ where: { venueId } })) + 1;
  const eventId = `EVT-${venue.venueCode}-${String(seq).padStart(3, "0")}`;
  const eventCode = `${venue.venueCode}-${new Date().getFullYear()}-${String(seq).padStart(3, "0")}`;

  const totalQuota = categories.reduce((s: number, c: CategoryInput) => s + (c.quota || 0), 0);

  const event = await prisma.event.create({
    data: {
      id: eventId,
      eventCode,
      eventName: name,
      description: body.description ? String(body.description) : null,
      venueId,
      layoutTemplateId: template.id,
      eventStatus: "DRAFT",
      startAt: startAt as Date,
      endAt: endAt as Date,
      salesStartAt: salesStart,
      salesEndAt: salesEnd,
      timezone: "Asia/Jakarta",
      categories: {
        create: categories.map((c, i) => ({
          id: `${eventId}-CAT-${i + 1}`,
          categoryName: c.name,
          price: c.price,
          quota: c.quota,
          status: "ACTIVE",
        })),
      },
      sections:
        categories.length > 0 && categories.some((c) => c.quota > 0)
          ? {
              create: [
                {
                  id: `${eventId}-SEC-1`,
                  sectionId: template.id,
                  sectionName: "Umum",
                  bookingType: "BOOK_BY_QUOTA",
                  capacity: totalQuota,
                  soldQuantity: 0,
                  inventoryStatus: "AVAILABLE",
                },
              ],
            }
          : undefined,
    },
  });

  const [categoryCount, sectionCount] = await Promise.all([
    prisma.ticketCategory.count({ where: { eventId: event.id } }),
    prisma.eventSection.count({ where: { eventId: event.id } }),
  ]);

  return created({
    event_id: event.id,
    event_code: event.eventCode,
    event_status: event.eventStatus,
    categories: categoryCount,
    sections: sectionCount,
  });
}
