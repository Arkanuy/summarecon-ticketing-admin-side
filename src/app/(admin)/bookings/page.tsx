import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { events, orders, tickets } from "@/lib/data/admin";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, rupiah } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth/page";

/* Halaman membaca sesi (runtime), jadi render-nya memblokir by design. */
export const instant = false;

export const metadata = { title: "Booking" };

const FILTERS = ["PENDING", "PAID", "EXPIRED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export default async function BookingsPage() {
  await requireAdminPage();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Booking</h1>
          <p className="page-lead">
            Status order dan status payment dipisah karena mewakili proses berbeda (§8.1–8.2).
          </p>
        </div>
        <button type="button" className="button button-secondary">Ekspor CSV</button>
      </div>

      <div className="chips" style={{ marginBottom: 12 }}>
        <span className="chip" aria-pressed="true">Semua {orders.length}</span>
        {FILTERS.map((f) => (
          <span className="chip" key={f}>
            {ORDER_STATUS_LABEL[f]} {orders.filter((o) => o.orderStatus === f).length}
          </span>
        ))}
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
            {orders.map((o) => {
              const ev = events.find((e) => e.id === o.eventId);
              const count = tickets.filter((t) => t.orderId === o.id).length;
              return (
                <tr key={o.id}>
                  <td className="mono">
                    <Link href={`/orders/${o.id}`} className="row-link">{o.id}</Link>
                  </td>
                  <td>
                    <Link href={`/orders/${o.id}`} className="t-name row-link">{o.buyer}</Link>
                    <div className="sub">{o.email}</div>
                  </td>
                  <td>{ev?.name ?? "—"}</td>
                  <td className="num mono">{count}</td>
                  <td className="num mono">{rupiah(o.total)}</td>
                  <td><StatusBadge status={o.orderStatus} label={ORDER_STATUS_LABEL[o.orderStatus]} /></td>
                  <td><StatusBadge status={o.paymentStatus} label={PAYMENT_STATUS_LABEL[o.paymentStatus]} /></td>
                  <td className="mono">{o.createdAt}</td>
                  <td className="num">
                    <Link href={`/orders/${o.id}`} className="button button-secondary button-small">
                      Detail
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
