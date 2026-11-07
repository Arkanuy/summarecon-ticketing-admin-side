import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminOrders } from "@/lib/data/admin-db";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, rupiah } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Booking" };

const FILTERS = ["PENDING", "PAID", "EXPIRED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export default async function BookingsPage() {
  await requireAdminPage();
  const orders = await getAdminOrders();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Booking</h1>
          <p className="page-lead">
            {orders.length} order di database. Status order dan status payment dipisah (§8.1–8.2).
          </p>
        </div>
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
            {orders.length === 0 ? (
              <tr><td colSpan={9} className="empty">Belum ada order.</td></tr>
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
