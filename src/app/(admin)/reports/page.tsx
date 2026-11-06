import { Card } from "@/components/ui/Card";
import { events } from "@/lib/data/admin";
import { rupiah } from "@/lib/utils";

export const metadata = { title: "Laporan" };

export default function ReportsPage() {
  const rows = events.flatMap((e) =>
    e.categories.map((c) => ({ event: e.name, category: c.name, price: c.price, sold: c.sold, quota: c.quota, revenue: c.sold * c.price })),
  );
  const total = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Laporan</h1>
          <p className="page-lead">Rekap penjualan per event dan kategori tiket.</p>
        </div>
        <button type="button" className="button button-secondary">Ekspor CSV</button>
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
            {rows.map((r) => (
              <tr key={`${r.event}-${r.category}`}>
                <td>{r.event}</td>
                <td>{r.category}</td>
                <td className="num mono">{rupiah(r.price)}</td>
                <td className="num mono">{r.sold}</td>
                <td className="num mono">{r.quota}</td>
                <td className="num mono">{rupiah(r.revenue)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="t-name">Total</td>
              <td className="num mono t-name">{rupiah(total)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <div className="note">Angka dari data contoh. Laporan kehadiran menunggu data check-in tersambung ke database.</div>
    </>
  );
}
