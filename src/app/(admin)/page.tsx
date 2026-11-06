import Link from "next/link";
import { EventRow } from "@/components/event/EventRow";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { events, orders, refunds, tickets } from "@/lib/data/admin";
import { ORDER_STATUS_LABEL, REFUND_STATUS_LABEL, rupiah, ticketSummary } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const OPEN_REFUND = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "NEED_CONFIRMATION"];

export default function DashboardPage() {
  const sold = events.reduce((s, e) => s + ticketSummary(e.categories).sold, 0);
  const quota = events.reduce((s, e) => s + ticketSummary(e.categories).quota, 0);
  const revenue = orders
    .filter((o) => o.paymentStatus === "SUCCESS" || o.paymentStatus === "PARTIALLY_REFUNDED")
    .reduce((s, o) => s + o.total, 0);
  const checkedIn = tickets.filter((t) => t.attendance === "CHECKED_IN").length;
  const openRefund = refunds.filter((r) => OPEN_REFUND.includes(r.status));
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Ringkasan hari ini</h1>
          <p className="page-lead">
            {events.filter((e) => e.published).length} event publik · {sold} tiket terjual dari {quota} kuota.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/reports" className="button button-secondary">Laporan</Link>
          <Link href="/events" className="button button-primary">+ Event baru</Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat stat-accent">
          <b>{sold.toLocaleString("id-ID")}</b>
          <span>Tiket terjual</span>
          <div className="bar"><i style={{ width: `${Math.round((sold / quota) * 100)}%` }} /></div>
        </div>
        <div className="stat">
          <b>{rupiah(revenue)}</b>
          <span>Pendapatan</span>
        </div>
        <div className="stat">
          <b>{checkedIn}</b>
          <span>Check-in</span>
        </div>
        <div className="stat">
          <b>{openRefund.length}</b>
          <span>Refund menunggu</span>
        </div>
      </div>

      <div className="section-head">
        <h2 className="section-title">Event</h2>
        <Link href="/events" className="back-link" style={{ margin: 0 }}>Kelola semua →</Link>
      </div>
      {events.map((e) => <EventRow key={e.id} event={e} />)}

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
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="mono"><Link href={`/orders/${o.id}`}>{o.id}</Link></td>
                    <td>{o.buyer}</td>
                    <td><StatusBadge status={o.orderStatus} label={ORDER_STATUS_LABEL[o.orderStatus]} /></td>
                    <td className="num mono">{rupiah(o.total)}</td>
                  </tr>
                ))}
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
                {openRefund.map((r) => (
                  <tr key={r.id}>
                    <td className="mono"><Link href={`/refunds/${r.id}`}>{r.id}</Link></td>
                    <td><StatusBadge status={r.status} label={REFUND_STATUS_LABEL[r.status]} /></td>
                    <td className="num mono">{rupiah(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </>
  );
}
