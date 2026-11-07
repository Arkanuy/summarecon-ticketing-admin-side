import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PetalFan } from "@/components/shared/PetalMark";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminOrder } from "@/lib/data/admin-db";
import { prisma } from "@/lib/db";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, rupiah, fmtTanggal } from "@/lib/utils";

export const instant = false;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const scans = await prisma.checkinRecord.findMany({
    where: { orderId: id },
    orderBy: { scannedAt: "desc" },
  });

  return (
    <>
      <Link href="/bookings" className="back-link">← Booking Management</Link>

      <div className="page-head">
        <div>
          <span className="eyebrow"><i className="eyebrow-line" />Order</span>
          <h1 className="page-title mono" style={{ marginTop: 6, fontSize: 19 }}>{order.code}</h1>
          <p className="page-lead">
            {order.buyer.name} · {order.event.name} · dibuat {order.createdAt.toISOString().slice(0, 16).replace("T", " ")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <StatusBadge status={order.orderStatus} label={ORDER_STATUS_LABEL[order.orderStatus as keyof typeof ORDER_STATUS_LABEL] ?? order.orderStatus} />
          {order.paymentStatus ? (
            <StatusBadge status={order.paymentStatus} label={PAYMENT_STATUS_LABEL[order.paymentStatus as keyof typeof PAYMENT_STATUS_LABEL] ?? order.paymentStatus} />
          ) : null}
          <Badge tone="primary">{rupiah(order.total)}</Badge>
        </div>
      </div>

      <div className="grid g2">
        <Card flush>
          <div style={{ padding: "20px 20px 0" }}><h2 className="section-title">Tiket dalam order</h2></div>
          <table className="table">
            <thead><tr><th>Tiket</th><th>Peserta</th><th>Kursi</th><th>Status</th><th>Check-in</th></tr></thead>
            <tbody>
              {order.tickets.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.code}</td>
                  <td>{t.name}</td>
                  <td className="mono">{t.seat ?? t.section ?? "—"}</td>
                  <td>{t.status}</td>
                  <td>{t.attendance === "CHECKED_IN" ? "Sudah" : "Belum"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="note" style={{ margin: "16px 20px 20px" }}>
            {order.eTicket
              ? `QR order ini sudah dipakai ${order.eTicket.used} dari ${order.eTicket.valid} scan · sisa ${order.eTicket.remaining}.`
              : "E-ticket belum terbit untuk order ini."}
          </div>
        </Card>

        <div>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Kartu e-ticket</h2>
          <div className="ticket">
            <div className="ticket-top">
              <PetalFan stroke="#fff" width={3} className="svg" />
              <small>E-TICKET · SATU QR PER ORDER</small>
              <h3>{order.event.name}</h3>
              <p>{fmtTanggal(order.event.startAt)}</p>
            </div>
            <div className="ticket-mid">
              <div><span>Kursi</span><b>{order.tickets.map((t) => t.seat ?? "—").join(", ") || "—"}</b></div>
              <div><span>Peserta</span><b>{order.tickets.length}</b></div>
              <div><span>Scan</span><b>{order.eTicket ? `${order.eTicket.used}/${order.eTicket.valid}` : "—"}</b></div>
            </div>
            <div className="ticket-qr"><div className="qr-box" role="img" aria-label="Pratinjau QR order" /></div>
          </div>
        </div>
      </div>

      <div className="section-head"><h2 className="section-title">Riwayat scan</h2></div>
      <Card flush>
        <table className="table">
          <thead><tr><th>Waktu</th><th>Tiket</th><th>Hasil</th></tr></thead>
          <tbody>
            {scans.length === 0 ? (
              <tr><td colSpan={3} className="empty">Belum ada scan.</td></tr>
            ) : (
              scans.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.scannedAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="mono">{s.ticketId ?? "—"}</td>
                  <td>{s.scanResult === "SUCCESS" ? `Scan ${s.scanSequence}` : s.scanResult}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {order.refunds.length ? (
        <>
          <div className="section-head"><h2 className="section-title">Refund terkait</h2></div>
          <Card>
            {order.refunds.map((r) => (
              <div key={r.id} className="row-item" style={{ border: 0, padding: "10px 0", borderRadius: 0, boxShadow: "none" }}>
                <span className="mono">{r.id}</span>
                <span className="mono">{rupiah(r.amount)}</span>
                <span className="sp">
                  <StatusBadge status={r.status} label={r.status} />
                  <Link href={`/refunds/${r.id}`} className="button button-secondary button-small">Detail</Link>
                </span>
              </div>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}
