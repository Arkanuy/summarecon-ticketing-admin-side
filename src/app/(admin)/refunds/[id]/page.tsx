import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { KeyValue } from "@/components/ui/KeyValue";
import { RefundActions } from "@/components/refund/RefundActions";
import { events, orders, refunds, tickets } from "@/lib/data/admin";
import { REFUND_STATUS_LABEL, rupiah } from "@/lib/utils";

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return refunds.map(({ id }) => ({ id }));
}

export default async function RefundDetailPage({ params }: PageProps) {
  const { id } = await params;
  const refund = refunds.find((r) => r.id === id);
  if (!refund) notFound();

  const order = orders.find((o) => o.id === refund.orderId);
  const ticket = tickets.find((t) => t.id === refund.ticketId);
  const event = events.find((e) => e.id === order?.eventId);
  const complete = Boolean(refund.method && refund.accountNo && refund.accountName);

  return (
    <>
      <Link href="/refunds" className="back-link">← Refund Management</Link>

      <div className="page-head">
        <div>
          <span className="eyebrow">
            <i className="eyebrow-line" />
            {refund.source === "EVENT_CANCELLED" ? "Refund pembatalan event" : "Pengajuan peserta"}
          </span>
          <h1 className="page-title mono" style={{ marginTop: 6, fontSize: 19 }}>{refund.id}</h1>
          <p className="page-lead">{refund.orderId} / {refund.ticketId} · diajukan {refund.requestedAt}</p>
        </div>
        <StatusBadge status={refund.status} label={REFUND_STATUS_LABEL[refund.status]} />
      </div>

      <div className="grid g2">
        <Card>
          <h2 className="section-title" style={{ marginBottom: 12 }}>Data refund</h2>
          <dl style={{ margin: 0 }}>
            <KeyValue label="Peserta" value={ticket?.name ?? "—"} />
            <KeyValue label="Event" value={event?.name ?? "—"} />
            <KeyValue label="Nominal" value={rupiah(refund.amount)} />
            <KeyValue label="Metode" value={refund.method ? (refund.method === "BANK" ? "Transfer bank" : "E-wallet") : "Belum diisi"} />
            <KeyValue label="Bank / e-wallet" value={refund.bank ?? "—"} />
            <KeyValue label="Nomor rekening" value={refund.accountNo ?? "—"} />
            <KeyValue label="Nama pemilik" value={refund.accountName ?? "—"} />
            <KeyValue label="Terakhir diubah" value={refund.updatedAt} />
          </dl>
          {complete ? null : (
            <div className="note" style={{ marginBottom: 0 }}>
              Data rekening belum lengkap. Hubungi peserta lewat WhatsApp sebelum transfer manual.
            </div>
          )}
        </Card>

        <RefundActions
          refundId={refund.id}
          status={refund.status}
          ticketId={refund.ticketId}
          participantName={ticket?.name ?? "peserta"}
        />
      </div>
    </>
  );
}
