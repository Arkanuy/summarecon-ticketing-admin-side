import Link from "next/link";
import { Card, StatCard } from "@/components/ui/Card";
import { VersionBadge, Badge } from "@/components/ui/Badge";
import { Petal } from "@/components/shared/PetalMark";
import { PublishToggle } from "@/components/event/PublishToggle";
import { events, orders, refunds, tickets } from "@/lib/data/admin";
import { EVENT_STATUS_LABEL, rupiah, ticketSummary } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const OPEN_REFUND = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "NEED_CONFIRMATION"];

export default function DashboardPage() {
  const sold = events.reduce((sum, e) => sum + ticketSummary(e.categories).sold, 0);
  const quota = events.reduce((sum, e) => sum + ticketSummary(e.categories).quota, 0);
  const revenue = orders
    .filter((o) => o.paymentStatus === "SUCCESS" || o.paymentStatus === "PARTIALLY_REFUNDED")
    .reduce((sum, o) => sum + o.total, 0);
  const checkedIn = tickets.filter((t) => t.attendance === "CHECKED_IN").length;
  const openRefunds = refunds.filter((r) => OPEN_REFUND.includes(r.status)).length;
  const activeEvents = events.filter((e) => e.published && e.status === "DIJUAL");

  return (
    <>
      {/* Banner sapaan — pola .adm .gr pada style guide §9 */}
      <div className="greeter">
        <div>
          <h1>Halo, Admin</h1>
          <p>
            {activeEvents.length} event aktif, {sold} tiket terjual dari {quota} kuota.
          </p>
        </div>
        <Petal variant="fan" filled={false} stroke="currentColor" className="greeter-art" />
      </div>

      <div className="stats">
        <StatCard label="Tiket terjual" value={sold.toLocaleString("id-ID")} sub={`${Math.round((sold / quota) * 100)}% dari kuota`} progress={Math.round((sold / quota) * 100)} />
        <StatCard label="Pendapatan" value={rupiah(revenue)} sub="order berbayar" />
        <StatCard label="Check-in" value={String(checkedIn)} sub="peserta tercatat hadir" />
        <StatCard label="Refund menunggu" value={String(openRefunds)} sub="perlu tindakan admin" />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, margin: "26px 0 12px", flexWrap: "wrap" }}>
        <h2 className="section-title">Event</h2>
        <Link href="/events" className="back-link">
          Kelola semua event →
        </Link>
      </div>

      {events.map((event) => {
        const summary = ticketSummary(event.categories);
        return (
          <div className="row-item" key={event.id}>
            <div style={{ minWidth: 0 }}>
              <Link href={`/events/${event.id}`}>
                <b>{event.name}</b>
              </Link>
              <div className="sub">
                {event.date} · {event.time} · {summary.sold}/{summary.quota} kursi
              </div>
            </div>
            <div className="sp">
              <VersionBadge status={event.status} label={EVENT_STATUS_LABEL[event.status]} />
              <PublishToggle published={event.published} label={event.name} />
            </div>
          </div>
        );
      })}

      <div className="note">
        Angka di atas dibaca dari data contoh <span className="mono">src/lib/data/admin.ts</span>. Saklar publikasi
        memperbarui tampilan saja; hubungkan ke Server Action sebelum dipakai tim asli.
      </div>

      <div className="grid g2" style={{ marginTop: 20 }}>
        <Card>
          <div className="overline">Refund</div>
          <h2 className="section-title" style={{ marginTop: 6 }}>
            {openRefunds} pengajuan menunggu
          </h2>
          <p className="muted" style={{ fontSize: 14 }}>
            Termasuk refund akibat pembatalan event dan data rekening yang belum lengkap.
          </p>
          <Link href="/refunds" className="btn btn-tint btn-sm" style={{ marginTop: 10 }}>
            Buka Refund Management
          </Link>
        </Card>
        <Card>
          <div className="overline">Check-in</div>
          <h2 className="section-title" style={{ marginTop: 6 }}>
            {checkedIn} peserta sudah masuk
          </h2>
          <p className="muted" style={{ fontSize: 14 }}>
            Satu QR per order. Jumlah scan dibatasi tiket valid dalam order.
          </p>
          <Link href="/checkin" className="btn btn-tint btn-sm" style={{ marginTop: 10 }}>
            Buka pemindai QR
          </Link>
        </Card>
      </div>

      <p style={{ marginTop: 18 }}>
        <Badge tone="muted">Prototipe admin · satu dashboard, hak akses per role</Badge>
      </p>
    </>
  );
}
