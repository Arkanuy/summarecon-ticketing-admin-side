import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminRefunds } from "@/lib/data/admin-db";
import { REFUND_STATUS_LABEL, rupiah } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Refund" };

const GROUPS = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "NEED_CONFIRMATION"] as const;

export default async function RefundsPage() {
  await requireAdminPage();
  const refunds = await getAdminRefunds();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Refund</h1>
          <p className="page-lead">
            {refunds.length} pengajuan di database. Dana dikirim manual; sistem mencatat status (§6.4 no.9–10).
          </p>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        {GROUPS.map((g) => {
          const list = refunds.filter((r) => r.status === g);
          return (
            <div className="stat" key={g}>
              <b>{list.length}</b>
              <span>{REFUND_STATUS_LABEL[g]}</span>
              <div className="sub mono" style={{ marginTop: 4 }}>
                {rupiah(list.reduce((s, r) => s + r.amount, 0))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-head">
        <h2 className="section-title">Semua pengajuan</h2>
        <span className="sub">{refunds.length} baris</span>
      </div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Refund</th><th>Peserta</th><th>Order</th><th className="num">Nominal</th>
              <th>Sumber</th><th>Data</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 ? (
              <tr><td colSpan={8} className="empty">Belum ada pengajuan refund.</td></tr>
            ) : (
              refunds.map((r) => (
                <tr key={r.id}>
                  <td className="mono">
                    <Link href={`/refunds/${r.id}`} className="row-link">{r.code}</Link>
                  </td>
                  <td>
                    <Link href={`/refunds/${r.id}`} className="t-name row-link">{r.participant}</Link>
                    <div className="sub">{r.buyerName}</div>
                  </td>
                  <td className="mono">
                    <Link href={`/orders/${r.orderId}`} className="row-link">{r.orderId}</Link>
                  </td>
                  <td className="num mono">{rupiah(r.amount)}</td>
                  <td>{r.type === "EVENT_CANCELLATION" ? "Pembatalan event" : "Pengajuan peserta"}</td>
                  <td>
                    {r.destinationComplete ? (
                      <>
                        {r.method === "BANK_TRANSFER" ? "Bank" : "E-wallet"}
                        <div className="sub">{r.provider} · {r.accountNo}</div>
                      </>
                    ) : (
                      <span className="muted">Belum lengkap</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge
                      status={r.status}
                      label={REFUND_STATUS_LABEL[r.status as keyof typeof REFUND_STATUS_LABEL] ?? r.status}
                    />
                  </td>
                  <td className="num">
                    <Link href={`/refunds/${r.id}`} className="button button-secondary button-small">Tangani</Link>
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
