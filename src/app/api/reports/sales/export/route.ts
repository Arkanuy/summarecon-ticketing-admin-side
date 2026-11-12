import { requireAdmin } from "@/lib/auth/guard";
import { getSalesReport } from "@/lib/data/admin-db";

/**
 * GET /api/reports/sales/export?from=&to= — CSV penjualan per event+kategori.
 * Memakai getSalesReport yang sama dengan halaman laporan, jadi angka di CSV
 * selalu sama dengan yang dilihat admin di layar.
 *
 * BOM UTF-8 di depan supaya Excel membaca "Rp" dan nama ber-aksen dengan benar.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if ("response" in guard) return guard.response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const { rows, total, orders, period } = await getSalesReport(from, to);

  const cell = (v: string | number) => {
    const s = String(v);
    /* Kutip kalau ada pemisah, kutip, atau baris baru — kalau tidak, angka tetap angka. */
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines: string[] = [
    ["Event", "Kategori", "Harga", "Terjual", "Kuota", "Pendapatan"].join(","),
    ...rows.map((r) =>
      [cell(r.event), cell(r.category), r.price, r.sold, r.quota, r.revenue].join(","),
    ),
    ["Total", "", "", orders.tickets, "", total].join(","),
    "",
    ["Periode", cell(period.label)].join(","),
    ["Order terbayar", orders.paid].join(","),
    ["Tiket terjual", orders.tickets].join(","),
  ];

  const name = `laporan-penjualan_${from || "awal"}_${to || "akhir"}.csv`;
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
