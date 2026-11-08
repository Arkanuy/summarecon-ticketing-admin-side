import { prisma } from "@/lib/db";

/**
 * Sidik jari data admin yang ditanam di halaman saat Server Component di-render.
 *
 * AutoRefresh membandingkan nilai ini dengan /api/admin/sync. Kalau berbeda, artinya
 * ada order / tiket / check-in baru sejak halaman dimuat, dan halaman dimuat ulang.
 */
export async function SyncStamp() {
  const [orders, tickets, checkins, latest] = await Promise.all([
    prisma.order.count(),
    prisma.ticket.count(),
    prisma.checkinRecord.count(),
    prisma.order.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true } }),
  ]);

  const stamp = [orders, tickets, checkins, latest?.id ?? "-", latest?.createdAt?.getTime() ?? 0].join(":");

  return <meta name="x-admin-sync" content={stamp} />;
}
