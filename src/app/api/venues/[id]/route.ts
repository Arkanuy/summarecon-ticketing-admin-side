import { prisma } from "@/lib/db";
import { ok, badRequest, notFound } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";

/**
 * PATCH /api/venues/:id — aktifkan / nonaktifkan venue.
 * Body: { status: "ACTIVE" | "INACTIVE" }
 *
 * Venue nonaktif tidak bisa dipakai event baru, tetapi event lama tetap utuh (§3.2).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = typeof body?.status === "string" ? body.status.toUpperCase() : null;
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return badRequest("Status harus ACTIVE atau INACTIVE");
  }

  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) return notFound("Venue");

  const updated = await prisma.venue.update({ where: { id }, data: { status } });
  return ok({ venue_id: updated.id, venue_name: updated.venueName, status: updated.status });
}
