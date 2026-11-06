import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Petal } from "@/components/shared/PetalMark";
import { PageHead } from "@/components/shared/PageHead";
import { events, orders, refunds, scanLogs, tickets } from "@/lib/data/admin";
import {
  ATTENDANCE_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  REFUND_STATUS_LABEL,
  TICKET_STATUS_LABEL,
  rupiah,
} from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return orders.map(({ id }) => ({ id }));
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = orders.find((o) => o.id === id);
  if (!order) notFound();

  const event = events.find((e) => e.id === order.eventId);
  const orderTickets = tickets.filter((t) => t.orderId === order.id);
  const validTickets = orderTickets.filter((t) => t.status === "ISSUED");
  const scans = scanLogs.filter((s) => s.orderId === order.id);
  const validScans = scans.filter((s) => s.result === "VALID").length;
  const related = refunds.filter((r) => r.orderId === order.id);

  return (
    <>
      <p style={{ marginBottom: 10 }}>
        <Link href="/bookings" className="back-link">
          ← Booking Management
        </Link>
      </p>

      <PageHead
        overline="Order"
        title={order.id}
        lead={`${order.buyer} · ${event?.name ?? "—"} · dibuat ${order.createdAt}`}
        actions={
          <>
            <StatusBadge status={order.orderStatus} label={ORDER_STATUS_LABEL[order.orderStatus]} />
            <StatusBadge status={order.paymentStatus} label={PAYMENT_STATUS_LABEL[order.paymentStatus]} />
            <Badge tone="primary">{rupiah(order.total)}</Badge>
          </>
        }
      />

      <div className="grid g2">
        <Card flush>
          <div style={{ padding: "16px 18px 0" }}>
            <h2 className="section-title">Tiket dalam order</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Tiket</th>
                <th>Peserta</th>
                <th>Kursi</th>
                <th>Status</th>
                <th>Check-in</th>
              </tr>
            </thead>
            <tbody>
              {orderTickets.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.id}</td>
                  <td>{t.name}</td>
                  <td className="mono">{t.seat ?? "—"}</td>
                  <td>
                    <StatusBadge status={t.status} label={TICKET_STATUS_LABEL[t.status]} />
                  </td>
                  <td>
                    <StatusBadge status={t.attendance} label={ATTENDANCE_LABEL[t.attendance]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note" style={{ margin: "14px 18px 18px" }}>
            QR order ini bisa dipakai {validTickets.length} kali check-in. Refund parsial mengurangi tiket valid, jadi
            batas scan ikut turun (§8.6).
          </div>
        </Card>

        <Card>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Kartu e-ticket
          </h2>
          <div className="ticket">
            <div className="top">
              <Petal variant="fan" filled={false} stroke="#fff" className="petal-bg" />
              <small>E-TICKET · SATU QR PER ORDER</small>
              <h3>{event?.name ?? "—"}</h3>
              <div className="meta">
                {event?.date} · {event?.time} · Summarecon Mall Bandung
              </div>
            </div>
            <div className="mid">
              <div>
                <span>Kursi</span>
                <b>{orderTickets.map((t) => t.seat ?? t.category).join(", ")}</b>
              </div>
              <div>
                <span>Peserta</span>
                <b>{order.buyer.split(" ")[0]} {order.buyer.split(" ")[1]?.charAt(0)}.</b>
              </div>
              <div>
                <span>Scan</span>
                <b>
                  {validScans}/{validTickets.length}
                </b>
              </div>
            </div>
            <div className="qr">
              <div className="qrb" aria-label="Pratinjau QR order" role="img" />
            </div>
          </div>
        </Card>
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>
        Riwayat scan
      </h2>
      <Card flush style={{ marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Tiket</th>
              <th>Petugas</th>
              <th>Hasil</th>
            </tr>
          </thead>
          <tbody>
            {scans.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  Belum ada scan.
                </td>
              </tr>
            ) : (
              scans.map((s) => (
                <tr key={`${s.at}-${s.result}`}>
                  <td className="mono">{s.at}</td>
                  <td className="mono">{s.ticketId ?? "—"}</td>
                  <td>{s.officer}</td>
                  <td>
                    <StatusBadge
                      status={s.result === "VALID" ? "SUCCESS" : s.result === "LIMIT" ? "PENDING" : "FAILED"}
                      label={s.result === "VALID" ? "Valid" : s.result === "LIMIT" ? "Batas scan" : "Tidak valid"}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {related.length > 0 ? (
        <>
          <h2 className="section-title" style={{ marginTop: 28 }}>
            Refund terkait
          </h2>
          <Card style={{ marginTop: 12 }}>
            {related.map((r) => (
              <div key={r.id} className="row-item">
                <span className="mono">{r.id}</span>
                <span className="mono">{rupiah(r.amount)}</span>
                <span className="sp">
                  <StatusBadge status={r.status} label={REFUND_STATUS_LABEL[r.status]} />
                  <Link href={`/refunds/${r.id}`} className="btn btn-outline btn-sm">
                    Detail
                  </Link>
                </span>
              </div>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}
