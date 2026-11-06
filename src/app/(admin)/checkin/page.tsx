import Link from "next/link";
import { QrScanner } from "@/components/checkin/QrScanner";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { events, orders, scanLogs } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/auth/page";

/* Halaman membaca sesi (runtime), jadi render-nya memblokir by design. */
export const instant = false;

export const metadata = { title: "Check-in" };

export default async function CheckinPage() {
  await requireAdminPage();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Check-in</h1>
          <p className="page-lead">
            Satu QR per order. Jumlah scan dibatasi jumlah tiket valid dalam order (§8.6).
          </p>
        </div>
      </div>

      <QrScanner orders={orders.map((o) => ({ id: o.id, buyer: o.buyer, paymentStatus: o.paymentStatus }))} />

      <div className="section-head">
        <h2 className="section-title">Riwayat scan</h2>
        <span className="sub">
          {scanLogs.length} scan · {events.length} event
        </span>
      </div>
      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Waktu</th><th>Order</th><th>Tiket</th><th>Petugas</th><th>Hasil</th></tr>
          </thead>
          <tbody>
            {scanLogs.map((s) => (
              <tr key={`${s.at}-${s.orderId}-${s.result}`}>
                <td className="mono">{s.at}</td>
                <td className="mono">
                  <Link href={`/orders/${s.orderId}`} className="row-link">{s.orderId}</Link>
                </td>
                <td className="mono">{s.ticketId ?? "—"}</td>
                <td>{s.officer}</td>
                <td>
                  <StatusBadge
                    status={s.result === "VALID" ? "SUCCESS" : s.result === "LIMIT" ? "PENDING" : "FAILED"}
                    label={s.result === "VALID" ? "Valid" : s.result === "LIMIT" ? "Batas scan" : "Tidak valid"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
