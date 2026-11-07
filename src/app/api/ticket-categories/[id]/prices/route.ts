import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, badRequest, notFound, conflict } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";

const tierSchema = z.object({
  label: z.string().min(1).max(40),
  price: z.number().int().positive(),
  starts_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  ends_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  is_promo: z.boolean().optional(),
});

/** GET /api/ticket-categories/:id/prices — daftar harga bertingkat + harga yang berlaku sekarang. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const category = await prisma.ticketCategory.findUnique({ where: { id }, include: { priceTiers: true } });
  if (!category) return notFound("Kategori tiket");

  const now = new Date();
  const active = category.priceTiers.find((t) => t.startsAt <= now && now <= t.endsAt);

  return ok({
    ticket_category_id: category.id,
    name: category.categoryName,
    base_price: category.price,
    current_price: active?.price ?? category.price,
    current_label: active?.label ?? "Harga dasar",
    tiers: category.priceTiers
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((t) => ({
        id: t.id,
        label: t.label,
        price: t.price,
        starts_at: t.startsAt,
        ends_at: t.endsAt,
        is_promo: t.isPromo,
        is_active: t.startsAt <= now && now <= t.endsAt,
      })),
  });
}

/** POST /api/ticket-categories/:id/prices — tambah periode harga (mis. promo). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const parsed = tierSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Data periode harga tidak valid", parsed.error.flatten());

  const category = await prisma.ticketCategory.findUnique({ where: { id }, include: { priceTiers: true } });
  if (!category) return notFound("Kategori tiket");

  const startsAt = new Date(parsed.data.starts_at);
  const endsAt = new Date(parsed.data.ends_at);
  if (endsAt <= startsAt) return badRequest("Tanggal selesai harus setelah tanggal mulai");

  /* Periode tidak boleh bertumpuk — satu waktu hanya punya satu harga. */
  const overlap = category.priceTiers.find((t) => startsAt <= t.endsAt && endsAt >= t.startsAt);
  if (overlap) {
    return conflict("Periode ini bertumpuk dengan harga yang sudah ada", {
      overlaps_with: { id: overlap.id, label: overlap.label, starts_at: overlap.startsAt, ends_at: overlap.endsAt },
    });
  }

  const tier = await prisma.ticketPriceTier.create({
    data: {
      id: `TPT-${Date.now().toString(36).toUpperCase()}`,
      ticketCategoryId: id,
      label: parsed.data.label,
      price: parsed.data.price,
      startsAt,
      endsAt,
      isPromo: parsed.data.is_promo ?? false,
    },
  });

  return ok({ id: tier.id, label: tier.label, price: tier.price, starts_at: tier.startsAt, ends_at: tier.endsAt }, { status: 201 });
}

/** DELETE /api/ticket-categories/:id/prices?tier_id= — hapus periode. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const tierId = new URL(request.url).searchParams.get("tier_id");
  if (!tierId) return badRequest("tier_id wajib diisi");

  const tier = await prisma.ticketPriceTier.findFirst({ where: { id: tierId, ticketCategoryId: id } });
  if (!tier) return notFound("Periode harga");

  await prisma.ticketPriceTier.delete({ where: { id: tierId } });
  return ok({ deleted: tierId });
}
