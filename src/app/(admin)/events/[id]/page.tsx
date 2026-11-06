import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge, VersionBadge } from "@/components/ui/Badge";
import { PageHead } from "@/components/shared/PageHead";
import { SeatBlocking } from "@/components/seat-map/SeatBlocking";
import { events, orders, tickets } from "@/lib/data/admin";
import { ATTENDANCE_LABEL, BOOKING_MODE_LABEL, EVENT_STATUS_LABEL, TICKET_STATUS_LABEL, rupiah } from "@/lib/utils";

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
      <p style={{ marginBottom: 10 }}>
        <Link href="/events" className="back-link">
          ← Semua event
        </Link>
      </p>

      <PageHead
        overline={event.category.toUpperCase()}
        title={event.name}
        lead={`${event.date} · ${event.time} · ${BOOKING_MODE_LABEL[event.bookingMode]}`}
        actions={
          <>
            <VersionBadge status={event.status} label={EVENT_STATUS_LABEL[event.status]} />
            <Badge tone={event.published ? "ok" : "muted"}>{event.published ? "Publik" : "Belum publik"}</Badge>
            <Badge tone="muted">
              Jual {event.saleStart} – {event.saleEnd}
            </Badge>
          </>
        }
      />

      {event.bookingMode === "SEAT" && event.seats ? (
        <SeatBlocking eventId={event.id} seats={event.seats} rows={event.seatRows ?? []} cols={event.seatCols ?? 0} />
      ) : (
        <div className="grid g2">
          {event.categories.map((c) => (
            <Card key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 className="section-title">{c.name}</h3>
                <span className="mono">
                  {c.sold}/{c.quota}
                </span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.round((c.sold / c.quota) * 100)}%` }} />
              </div>
              <div className="sub" style={{ marginTop: 8, fontSize: 13 }}>
                {Math.round((c.sold / c.quota) * 100)}% terisi · sisa {c.quota - c.sold} · {rupiah(c.price)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="section-title" style={{ marginTop: 28 }}>
        Kategori tiket
      </h2>
      <Card flush style={{ marginTop: 12 }}>
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

      <h2 className="section-title" style={{ marginTop: 28 }}>
        Peserta & tiket
      </h2>
      <Card flush style={{ marginTop: 12 }}>
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
              <tr>
                <td colSpan={6} className="empty">
                  Belum ada tiket terjual.
                </td>
              </tr>
            ) : (
              eventTickets.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.id}</td>
                  <td>{t.name}</td>
                  <td className="mono">
                    <Link href={`/orders/${t.orderId}`}>{t.orderId}</Link>
                  </td>
                  <td className="mono">{t.seat ?? "—"}</td>
                  <td>
                    <StatusBadge status={t.status} label={TICKET_STATUS_LABEL[t.status]} />
                  </td>
                  <td>
                    <StatusBadge status={t.attendance} label={ATTENDANCE_LABEL[t.attendance]} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
