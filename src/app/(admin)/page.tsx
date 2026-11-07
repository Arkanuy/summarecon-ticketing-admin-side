import Link from "next/link";
import { EventRow } from "@/components/event/EventRow";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminDashboard } from "@/lib/data/admin-db";
import { ORDER_STATUS_LABEL, REFUND_STATUS_LABEL, rupiah } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireAdminPage();
  const { events, recentOrders, openRefunds, stats } = await getAdminDashboard();
  const occupancy = stats.quota ? Math.round((stats.sold / stats.quota) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Ringkasan hari ini</h1>
          <p className="page-lead">
            {stats.published} event publik · {stats.sold} tiket terjual dari {stats.quota} kuota.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/reports" className="button button-secondary">Laporan</Link>
          <Link href="/events/new" className="button button-primary">+ Event baru</Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat stat-accent">
          <b>{stats.sold.toLocaleString("id-ID")}</b>
          <span>Tiket terjual</span>
          <div className="bar"><i style={{ width: `${occupancy}%` }} /></div>
        </div>
        <div className="stat">
          <b>{rupiah(stats.revenue)}</b>
          <span>Pendapatan</span>
        </div>
        <div className="stat">
          <b>{stats.checkedIn}</b>
          <span>Check-in</span>
        </div>
        <div className="stat">
          <b>{stats.refundOpen}</b>
          <span>Refund menunggu</span>
        </div>
      </div>

      <div className="section-head">
        <h2 className="section-title">Event</h2>
        <Link href="/events" className="back-link" style={{ margin: 0 }}>Kelola semua →</Link>
      </div>
      {events.length === 0 ? (
        <Card><p className="sub">Belum ada event di database.</p></Card>
      ) : (
        events.map((e) => <EventRow key={e.id} event={e} />)
      )}

      <div className="grid g2" style={{ marginTop: 22 }}>
        <div>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2 className="section-title">Order terbaru</h2>
            <Link href="/bookings" className="back-link" style={{ margin: 0 }}>Semua order →</Link>
          </div>
          <Card flush>
            <table className="table">
              <thead>
                <tr><th>Order</th><th>Pemesan</th><th>Status</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={4} className="empty">Belum ada order.</td></tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="mono"><Link href={`/orders/${o.id}`} className="row-link">{o.code}</Link></td>
                      <td>{o.buyerName}</td>
                      <td><StatusBadge status={o.orderStatus} label={ORDER_STATUS_LABEL[o.orderStatus as keyof typeof ORDER_STATUS_LABEL] ?? o.orderStatus} /></td>
                      <td className="num mono">{rupiah(o.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2 className="section-title">Refund perlu tindakan</h2>
            <Link href="/refunds" className="back-link" style={{ margin: 0 }}>Semua →</Link>
          </div>
          <Card flush>
            <table className="table">
              <thead>
                <tr><th>Refund</th><th>Status</th><th className="num">Nominal</th></tr>
              </thead>
              <tbody>
                {openRefunds.length === 0 ? (
                  <tr><td colSpan={3} className="empty">Tidak ada refund terbuka.</td></tr>
                ) : (
                  openRefunds.map((r) => (
                    <tr key={r.id}>
                      <td className="mono"><Link href={`/refunds/${r.id}`} className="row-link">{r.code}</Link></td>
                      <td><StatusBadge status={r.status} label={REFUND_STATUS_LABEL[r.status as keyof typeof REFUND_STATUS_LABEL] ?? r.status} /></td>
                      <td className="num mono">{rupiah(r.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
