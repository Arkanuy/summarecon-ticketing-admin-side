import Link from "next/link";
import { PageHead } from "@/components/shared/PageHead";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { events, orders, tickets } from "@/lib/data/admin";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, rupiah } from "@/lib/utils";

export const metadata = { title: "Booking" };

const FILTERS = ["PENDING", "PAID", "EXPIRED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export default function BookingsPage() {
  return (
    <>
      <PageHead
        eyebrow="Booking Management"
        title={<>Pesanan <em>masuk</em></>}
        lead="Status order dan status payment dipisahkan karena mewakili proses yang berbeda (§8.1–8.2)."
      />

      <div className="chips" style={{ marginBottom: 18 }}>
        <span className="chip" aria-pressed="true">
          Semua {orders.length}
        </span>
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
              <th>Order</th>
              <th>Pemesan</th>
              <th>Event</th>
              <th className="num">Tiket</th>
              <th className="num">Total</th>
              <th>Order</th>
              <th>Payment</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const event = events.find((e) => e.id === order.eventId);
              const count = tickets.filter((t) => t.orderId === order.id).length;
              return (
                <tr key={order.id}>
                  <td className="mono">
                    <Link href={`/orders/${order.id}`}>{order.id}</Link>
                  </td>
                  <td>
                    <div className="t-name">{order.buyer}</div>
                    <div className="sub">{order.email}</div>
                  </td>
                  <td>{event?.name ?? "—"}</td>
                  <td className="num mono">{count}</td>
                  <td className="num mono">{rupiah(order.total)}</td>
                  <td>
                    <StatusBadge status={order.orderStatus} label={ORDER_STATUS_LABEL[order.orderStatus]} />
                  </td>
                  <td>
                    <StatusBadge status={order.paymentStatus} label={PAYMENT_STATUS_LABEL[order.paymentStatus]} />
                  </td>
                  <td className="mono">{order.createdAt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
