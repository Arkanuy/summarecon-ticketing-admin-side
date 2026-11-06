import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { orders, refunds, tickets } from "@/lib/data/admin";
import { REFUND_STATUS_LABEL, rupiah } from "@/lib/utils";

export const metadata = { title: "Refund" };

const GROUPS = ["REQUESTED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "NEED_CONFIRMATION"] as const;
const METHOD = { BANK: "Transfer bank", EWALLET: "E-wallet" } as const;

export default function RefundsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Refund</h1>
          <p className="page-lead">
            Dana dikirim manual di luar sistem; sistem hanya mencatat status dan riwayat (§6.4 no.9–10).
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
              <th>Refund</th><th>Peserta</th><th>Order / Tiket</th><th className="num">Nominal</th>
              <th>Sumber</th><th>Metode</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => {
              const ticket = tickets.find((t) => t.id === r.ticketId);
              const order = orders.find((o) => o.id === r.orderId);
              return (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td>
                    <div className="t-name">{ticket?.name ?? "—"}</div>
                    <div className="sub">{order?.buyer}</div>
                  </td>
                  <td className="mono">
                    {r.orderId}
                    <div className="sub mono">{r.ticketId}</div>
                  </td>
                  <td className="num mono">{rupiah(r.amount)}</td>
                  <td>{r.source === "EVENT_CANCELLED" ? "Pembatalan event" : "Pengajuan peserta"}</td>
                  <td>
                    {r.method ? (
                      <>
                        {METHOD[r.method]}
                        <div className="sub">{r.bank} · {r.accountNo}</div>
                      </>
                    ) : (
                      <span className="muted">Belum diisi</span>
                    )}
                  </td>
                  <td><StatusBadge status={r.status} label={REFUND_STATUS_LABEL[r.status]} /></td>
                  <td className="num">
                    <Link href={`/refunds/${r.id}`} className="button button-secondary button-small">Tangani</Link>
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
