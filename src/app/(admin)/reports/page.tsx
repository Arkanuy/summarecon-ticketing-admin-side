import { Card } from "@/components/ui/Card";
import { requireAdminPage } from "@/lib/auth/page";
import { ReportFilter } from "@/components/report/ReportFilter";
import { getSalesReport } from "@/lib/data/admin-db";
import { rupiah } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Laporan" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdminPage();
  const { from, to } = await searchParams;
  const { rows, total, orders, period } = await getSalesReport(from, to);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Laporan</h1>
          <p className="page-lead">
            Penjualan per event dan kategori. Filter periode memakai tanggal pembayaran order.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`/api/reports/sales/export${(() => {
              const p = new URLSearchParams();
              if (from) p.set("from", from);
              if (to) p.set("to", to);
              const s = p.toString();
              return s ? `?${s}` : "";
            })()}`}
            className="button button-primary"
            download
          >
            Unduh CSV
          </a>
        </div>
      </div>

      <ReportFilter from={from ?? ""} to={to ?? ""} />

      <div className="stats" style={{ marginTop: 14 }}>
        <div className="stat stat-accent">
          <b>{rupiah(total)}</b><span>Pendapatan periode</span>
        </div>
        <div className="stat"><b>{orders.paid}</b><span>Order terbayar</span></div>
        <div className="stat"><b>{orders.tickets}</b><span>Tiket terjual</span></div>
        <div className="stat"><b>{period.label}</b><span>Periode</span></div>
      </div>

      <Card flush style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Event</th><th>Kategori</th><th className="num">Harga</th>
              <th className="num">Terjual</th><th className="num">Kuota</th><th className="num">Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="empty">Tidak ada penjualan pada periode ini.</td></tr>
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

      <div className="note">
        Angka dihitung dari order yang lunas pada rentang tanggal tersebut. Tanpa filter, semua order dihitung.
      </div>
    </>
  );
}
