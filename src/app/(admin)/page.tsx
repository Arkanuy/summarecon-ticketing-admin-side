import Link from "next/link";
import { EventCard } from "@/components/event/EventCard";
import { PageHead } from "@/components/shared/PageHead";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { events, orders, refunds, tickets } from "@/lib/data/admin";
import { eventTone, rupiah, ticketSummary } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const OPEN_REFUND = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "NEED_CONFIRMATION"];

export default function DashboardPage() {
  const sold = events.reduce((s, e) => s + ticketSummary(e.categories).sold, 0);
  const quota = events.reduce((s, e) => s + ticketSummary(e.categories).quota, 0);
  const revenue = orders
    .filter((o) => o.paymentStatus === "SUCCESS" || o.paymentStatus === "PARTIALLY_REFUNDED")
    .reduce((s, o) => s + o.total, 0);
  const checkedIn = tickets.filter((t) => t.attendance === "CHECKED_IN").length;
  const openRefunds = refunds.filter((r) => OPEN_REFUND.includes(r.status)).length;
  const activeEvents = events.filter((e) => e.published && e.status === "DIJUAL");

  return (
    <>
      <PageHead
        eyebrow="Summarecon Mall · Bandung"
        title={<>Halo, <em>Admin</em></>}
        lead={`${activeEvents.length} event aktif, ${sold} tiket terjual dari ${quota} kuota. Semua yang perlu ditangani hari ini ada di bawah.`}
        actions={
          <Link href="/events" className="button button-primary">
            Kelola event <span aria-hidden="true">→</span>
          </Link>
        }
      />

      <div className="stats">
        <div className="stat">
          <b>{sold.toLocaleString("id-ID")}</b>
          <span>Tiket terjual</span>
          <div className="bar">
            <i style={{ width: `${Math.round((sold / quota) * 100)}%` }} />
          </div>
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
          <b>{openRefunds}</b>
          <span>Refund menunggu</span>
        </div>
      </div>

      <div className="section-head">
        <h2 className="section-title">Event yang dikelola</h2>
        <span className="sub">{events.length} event · {activeEvents.length} dijual</span>
      </div>

      <div className="event-grid">
        {events.map((event) => (
          <EventCard key={event.id} event={event} tone={eventTone(event.category)} />
        ))}
      </div>

      <div className="section-head">
        <h2 className="section-title">Perlu tindakan</h2>
      </div>

      <div className="grid g2-even">
        <Card>
          <div className="card-head">
            <h3 className="section-title" style={{ fontSize: 17 }}>Refund</h3>
            <Badge tone="bad">{openRefunds} menunggu</Badge>
          </div>
          <p className="sub" style={{ fontSize: 12, lineHeight: 1.7 }}>
            Termasuk refund akibat pembatalan event dan data rekening yang belum lengkap. Dana dikirim manual di luar
            sistem.
          </p>
          <Link href="/refunds" className="button button-secondary button-small" style={{ marginTop: 14 }}>
            Buka Refund Management
          </Link>
        </Card>
        <Card>
          <div className="card-head">
            <h3 className="section-title" style={{ fontSize: 17 }}>Check-in</h3>
            <Badge tone="ok">{checkedIn} hadir</Badge>
          </div>
          <p className="sub" style={{ fontSize: 12, lineHeight: 1.7 }}>
            Satu QR per order. Jumlah scan dibatasi tiket valid dalam order, jadi refund parsial ikut mengurangi kuota
            scan.
          </p>
          <Link href="/checkin" className="button button-secondary button-small" style={{ marginTop: 14 }}>
            Buka pemindai QR
          </Link>
        </Card>
      </div>
    </>
  );
}
