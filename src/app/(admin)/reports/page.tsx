import { Card } from "@/components/ui/Card";
import { PageHead } from "@/components/shared/PageHead";
import { events } from "@/lib/data/admin";
import { rupiah } from "@/lib/utils";

export const metadata = { title: "Laporan" };

export default function ReportsPage() {
  const rows = events.flatMap((event) =>
    event.categories.map((c) => ({
      event: event.name,
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
      <PageHead title="Dashboard & Reporting" lead="Laporan penjualan per event dan kategori tiket." />
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Kategori</th>
              <th className="num">Harga</th>
              <th className="num">Terjual</th>
              <th className="num">Kuota</th>
              <th className="num">Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.event}-${row.category}`}>
                <td>{row.event}</td>
                <td>{row.category}</td>
                <td className="num mono">{rupiah(row.price)}</td>
                <td className="num mono">{row.sold}</td>
                <td className="num mono">{row.quota}</td>
                <td className="num mono">{rupiah(row.revenue)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="t-name">
                Total
              </td>
              <td className="num mono t-name">{rupiah(total)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <div className="note">Angka dari data contoh. Laporan kehadiran menunggu data check-in tersambung ke database.</div>
    </>
  );
}
