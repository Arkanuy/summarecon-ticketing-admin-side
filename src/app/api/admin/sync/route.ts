import { ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/sync — sidik jari data yang berubah karena aktivitas peserta.
 *
 * Dipakai AutoRefresh untuk mendeteksi order/kursi/check-in baru tanpa polling
 * tabel besar: cukup hitung jumlah baris + waktu terakhir, kembalikan satu string.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const [orders, tickets, checkins, latestOrder] = await Promise.all([
    prisma.order.count(),
    prisma.ticket.count(),
    prisma.checkinRecord.count(),
    prisma.order.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, id: true } }),
  ]);

  return ok({
    stamp: [orders, tickets, checkins, latestOrder?.id ?? "-", latestOrder?.createdAt?.getTime() ?? 0].join(":"),
    orders,
    tickets,
    checkins,
  });
}
