import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { KeyValue } from "@/components/ui/KeyValue";
import { RefundActions } from "@/components/refund/RefundActions";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminRefund } from "@/lib/data/admin-db";
import { REFUND_STATUS_LABEL, rupiah } from "@/lib/utils";

export const instant = false;

export default async function RefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const refund = await getAdminRefund(id);
  if (!refund) notFound();

  const complete = Boolean(refund.destination);

  return (
    <>
      <Link href="/refunds" className="back-link">← Refund Management</Link>

      <div className="page-head">
        <div>
          <span className="eyebrow">
            <i className="eyebrow-line" />
            {refund.type === "EVENT_CANCELLATION" ? "Refund pembatalan event" : "Pengajuan peserta"}
          </span>
          <h1 className="page-title mono" style={{ marginTop: 6, fontSize: 19 }}>{refund.code}</h1>
          <p className="page-lead">
            {refund.orderId} · diajukan {refund.requestedAt.toISOString().slice(0, 16).replace("T", " ")}
          </p>
        </div>
        <StatusBadge status={refund.status} label={REFUND_STATUS_LABEL[refund.status as keyof typeof REFUND_STATUS_LABEL] ?? refund.status} />
      </div>

      <div className="grid g2">
        <Card>
          <h2 className="section-title" style={{ marginBottom: 12 }}>Data refund</h2>
          <dl style={{ margin: 0 }}>
            <KeyValue label="Peserta" value={refund.tickets.map((t) => t.name).join(", ") || "—"} />
            <KeyValue label="Event" value={refund.eventName} />
            <KeyValue label="Nominal" value={rupiah(refund.amount)} />
            <KeyValue label="Metode" value={refund.destination ? (refund.destination.method === "BANK_TRANSFER" ? "Transfer bank" : "E-wallet") : "Belum diisi"} />
            <KeyValue label="Bank / e-wallet" value={refund.destination?.provider ?? "—"} />
            <KeyValue label="Nomor rekening" value={refund.destination?.accountNo ?? "—"} />
            <KeyValue label="Nama pemilik" value={refund.destination?.holder ?? "—"} />
            <KeyValue label="Status data" value={refund.dataStatus} />
          </dl>
          {complete ? null : (
            <div className="note" style={{ marginBottom: 0 }}>
              Data rekening belum lengkap. Hubungi peserta lewat WhatsApp sebelum transfer manual.
            </div>
          )}
        </Card>

        <RefundActions
          refundId={refund.id}
          status={refund.status as never}
          ticketId={refund.tickets[0]?.id ?? "—"}
          participantName={refund.tickets[0]?.name ?? "peserta"}
        />
      </div>

      <div className="section-head"><h2 className="section-title">Riwayat status</h2></div>
      <Card flush>
        <table className="table">
          <thead><tr><th>Waktu</th><th>Dari</th><th>Ke</th><th>Catatan</th></tr></thead>
          <tbody>
            {refund.histories.length === 0 ? (
              <tr><td colSpan={4} className="empty">Belum ada riwayat.</td></tr>
            ) : (
              refund.histories.map((h, i) => (
                <tr key={i}>
                  <td className="mono">{h.at.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td>{h.from ?? "—"}</td>
                  <td>{h.to}</td>
                  <td className="sub">{h.reason ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
