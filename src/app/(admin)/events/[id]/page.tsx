import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge, VersionBadge } from "@/components/ui/Badge";
import { SeatBlocking } from "@/components/seat-map/SeatBlocking";
import { events, orders, tickets } from "@/lib/data/admin";
import { ATTENDANCE_LABEL, BOOKING_MODE_LABEL, EVENT_STATUS_LABEL, TICKET_STATUS_LABEL, rupiah } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth/page";

/* Halaman membaca sesi (runtime), jadi render-nya memblokir by design. */
export const instant = false;

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return events.map(({ id }) => ({ id }));
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const eventOrders = orders.filter((o) => o.eventId === event.id);
  const eventTickets = tickets.filter((t) => eventOrders.some((o) => o.id === t.orderId));

  return (
    <>
      <Link href="/events" className="back-link">← Semua event</Link>

      <div className="page-head">
        <div>
          <span className="eyebrow">
            <i className="eyebrow-line" />
            {event.category} · {BOOKING_MODE_LABEL[event.bookingMode]}
          </span>
          <h1 className="page-title" style={{ marginTop: 6 }}>{event.name}</h1>
          <p className="page-lead">{event.date} · {event.time} · Summarecon Mall Bandung</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <VersionBadge status={event.status} label={EVENT_STATUS_LABEL[event.status]} />
          <Badge tone={event.published ? "ok" : "muted"}>{event.published ? "Publik" : "Belum publik"}</Badge>
        </div>
      </div>

      {event.bookingMode === "SEAT" && event.seats ? (
        <SeatBlocking eventId={event.id} seats={event.seats} rows={event.seatRows ?? []} cols={event.seatCols ?? 0} />
      ) : (
        <div className="grid g2-even">
          {event.categories.map((c) => {
            const pct = Math.round((c.sold / c.quota) * 100);
            return (
              <Card key={c.id}>
                <div className="card-head" style={{ marginBottom: 10 }}>
                  <h3 className="section-title" style={{ fontSize: 17 }}>{c.name}</h3>
                  <span className="mono">{c.sold}/{c.quota}</span>
                </div>
                <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                <p className="sub" style={{ marginTop: 8 }}>
                  {pct}% terisi · sisa {c.quota - c.sold} · {rupiah(c.price)}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <div className="section-head">
        <h2 className="section-title">Kategori tiket</h2>
      </div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th className="num">Harga</th>
              <th className="num">Kuota</th>
              <th className="num">Terjual</th>
              <th className="num">Sisa</th>
            </tr>
          </thead>
          <tbody>
            {event.categories.map((c) => (
              <tr key={c.id}>
                <td className="t-name">{c.name}</td>
                <td className="num mono">{rupiah(c.price)}</td>
                <td className="num mono">{c.quota}</td>
                <td className="num mono">{c.sold}</td>
                <td className="num mono">{c.quota - c.sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="section-head">
        <h2 className="section-title">Peserta & tiket</h2>
      </div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Tiket</th>
              <th>Peserta</th>
              <th>Order</th>
              <th>Kursi</th>
              <th>Status</th>
              <th>Check-in</th>
            </tr>
          </thead>
          <tbody>
            {eventTickets.length === 0 ? (
              <tr><td colSpan={6} className="empty">Belum ada tiket terjual.</td></tr>
            ) : (
              eventTickets.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.id}</td>
                  <td>{t.name}</td>
                  <td className="mono"><Link href={`/orders/${t.orderId}`}>{t.orderId}</Link></td>
                  <td className="mono">{t.seat ?? "—"}</td>
                  <td><StatusBadge status={t.status} label={TICKET_STATUS_LABEL[t.status]} /></td>
                  <td><StatusBadge status={t.attendance} label={ATTENDANCE_LABEL[t.attendance]} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
