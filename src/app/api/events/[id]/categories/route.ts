import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guard";

/**
 * POST /api/events/:id/categories — tambah kategori tiket pada event.
 * Body: { name, price, quota, section_ids?: string[], status? }
 *
 * `section_ids` menautkan kategori ke section/area tertentu (mis. VIP = Block A,
 * Reguler = Block B), sehingga warna kategori di denah dan penjualan per area
 * mengikuti pilihan admin.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id: eventId } = await params;
  const body = await request.json().catch(() => null);

  const name = String(body?.name ?? "").trim();
  const price = Number(body?.price ?? 0);
  const quota = Number(body?.quota ?? 0);
  if (!name) {
    return NextResponse.json({ error: { code: "NAMA_KOSONG", message: "Nama kategori wajib diisi" } }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: { code: "HARGA_TIDAK_VALID", message: "Harga tidak valid" } }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { categories: true, sections: true } });
  if (!event) {
    return NextResponse.json({ error: { code: "EVENT_TIDAK_DITEMUKAN", message: "Event tidak ada" } }, { status: 404 });
  }

  const sectionIds: string[] = Array.isArray(body?.section_ids) ? body.section_ids.map(String) : [];
  const validSections = sectionIds.filter((s) => event.sections.some((x) => x.id === s));

  const seq = event.categories.length + 1;
  const category = await prisma.ticketCategory.create({
    data: {
      id: `${eventId}-CAT-${seq}-${Date.now().toString(36).slice(-4)}`,
      eventId,
      categoryName: name,
      price,
      quota: quota || 0,
      status: String(body?.status ?? "OPEN"),
      eventSectionId: validSections[0] ?? null,
    },
  });

  /* Tautkan section ke kategori ini (satu kategori boleh mencakup beberapa section). */
  if (validSections.length) {
    await prisma.eventSection.updateMany({
      where: { id: { in: validSections } },
      data: { ticketCategoryId: category.id },
    });
  }

  return NextResponse.json(
    {
      data: {
        category_id: category.id,
        name: category.categoryName,
        price: category.price,
        quota: category.quota,
        section_ids: validSections,
      },
    },
    { status: 201 },
  );
}
