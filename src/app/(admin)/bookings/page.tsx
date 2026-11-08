import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminOrders, getAdminEvents } from "@/lib/data/admin-db";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, rupiah } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Booking" };

const FILTERS = ["PENDING", "PAID", "EXPIRED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

/**
 * Daftar order dengan filter event dan status.
 * Filter disimpan di URL (?event=&status=) supaya bisa dibagikan dan tahan reload.
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; status?: string }>;
}) {
  await requireAdminPage();

  const { event: eventFilter, status: statusFilter } = await searchParams;
  const [allOrders, events] = await Promise.all([getAdminOrders(), getAdminEvents()]);

  const orders = allOrders.filter(
    (o) =>
      (!eventFilter || o.eventId === eventFilter) &&
      (!statusFilter || o.orderStatus === statusFilter),
  );

  const qs = (next: { event?: string; status?: string }) => {
    const p = new URLSearchParams();
    const e = next.event ?? eventFilter;
    const s = next.status ?? statusFilter;
    if (e) p.set("event", e);
    if (s) p.set("status", s);
    const str = p.toString();
    return str ? `/bookings?${str}` : "/bookings";
  };

  const activeEvent = events.find((e) => e.id === eventFilter);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Booking</h1>
          <p className="page-lead">
            {orders.length}
            {eventFilter || statusFilter ? ` dari ${allOrders.length}` : ""} order
            {activeEvent ? ` · ${activeEvent.name}` : ""}. Status order dan status payment dipisah (§8.1–8.2).
          </p>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 10 }}>
        <Link href={qs({ event: "", status: "" })} className="chip" aria-pressed={!eventFilter && !statusFilter}>
          Semua {allOrders.length}
        </Link>
        {events.map((e) => {
          const count = allOrders.filter((o) => o.eventId === e.id).length;
          if (count === 0) return null;
          return (
            <Link
              key={e.id}
              href={qs({ event: e.id })}
              className="chip"
              aria-pressed={eventFilter === e.id}
            >
              {e.name} {count}
            </Link>
          );
        })}
      </div>

      <div className="chips" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => {
          const count = allOrders.filter(
            (o) => o.orderStatus === f && (!eventFilter || o.eventId === eventFilter),
          ).length;
          return (
            <Link
              key={f}
              href={qs({ status: statusFilter === f ? "" : f })}
              className="chip"
              aria-pressed={statusFilter === f}
            >
              {ORDER_STATUS_LABEL[f]} {count}
            </Link>
          );
        })}
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Order</th><th>Pemesan</th><th>Event</th><th className="num">Tiket</th>
              <th className="num">Total</th><th>Order</th><th>Payment</th><th>Dibuat</th><th />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={9} className="empty">Tidak ada order untuk filter ini.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id}>
                  <td className="mono">
                    <Link href={`/orders/${o.id}`} className="row-link">{o.code}</Link>
                  </td>
                  <td>
                    <Link href={`/orders/${o.id}`} className="t-name row-link">{o.buyerName}</Link>
                    <div className="sub">{o.buyerEmail}</div>
                  </td>
                  <td>{o.eventName}</td>
                  <td className="num mono">{o.ticketCount}</td>
                  <td className="num mono">{rupiah(o.total)}</td>
                  <td>
                    <StatusBadge
                      status={o.orderStatus}
                      label={ORDER_STATUS_LABEL[o.orderStatus as keyof typeof ORDER_STATUS_LABEL] ?? o.orderStatus}
                    />
                  </td>
                  <td>
                    {o.paymentStatus ? (
                      <StatusBadge
                        status={o.paymentStatus}
                        label={PAYMENT_STATUS_LABEL[o.paymentStatus as keyof typeof PAYMENT_STATUS_LABEL] ?? o.paymentStatus}
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono">{o.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="num">
                    <Link href={`/orders/${o.id}`} className="button button-secondary button-small">Detail</Link>
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
