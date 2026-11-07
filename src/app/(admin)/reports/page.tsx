import { Card } from "@/components/ui/Card";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminEvents } from "@/lib/data/admin-db";
import { rupiah } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Laporan" };

export default async function ReportsPage() {
  await requireAdminPage();
  const events = await getAdminEvents();

  const rows = events.flatMap((e) =>
    e.categories.map((c) => ({
      event: e.name,
      category: c.name,
      price: c.price,
      sold: c.sold,
      quota: c.quota,
      revenue: c.sold * c.price,
    })),
  );
  const total = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Laporan</h1>
          <p className="page-lead">Rekap penjualan per event dan kategori, dihitung dari database.</p>
        </div>
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Event</th><th>Kategori</th><th className="num">Harga</th>
              <th className="num">Terjual</th><th className="num">Kuota</th><th className="num">Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="empty">Belum ada data penjualan.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.event}-${r.category}`}>
                  <td>{r.event}</td>
                  <td>{r.category}</td>
                  <td className="num mono">{rupiah(r.price)}</td>
                  <td className="num mono">{r.sold}</td>
                  <td className="num mono">{r.quota}</td>
                  <td className="num mono">{rupiah(r.revenue)}</td>
                </tr>
              ))
            )}
            <tr>
              <td colSpan={5} className="t-name">Total</td>
              <td className="num mono t-name">{rupiah(total)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </>
  );
}
