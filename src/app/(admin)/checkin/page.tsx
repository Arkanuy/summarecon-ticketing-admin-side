import { PageHead } from "@/components/shared/PageHead";
import { QrScanner } from "@/components/checkin/QrScanner";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { orders, scanLogs } from "@/lib/data/admin";

export const metadata = { title: "Check-in" };

export default function CheckinPage() {
  return (
    <>
      <PageHead
        eyebrow="Check-in Management"
        title={<>Pindai <em>e-ticket</em></>}
        lead="Satu QR per order. Jumlah scan dibatasi jumlah tiket valid dalam order, bukan status pernah check-in (§8.6)."
      />

      <QrScanner orders={orders.map((o) => ({ id: o.id, buyer: o.buyer, paymentStatus: o.paymentStatus }))} />

      <div className="section-head">
        <h2 className="section-title">Riwayat scan</h2>
      </div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Order</th>
              <th>Tiket</th>
              <th>Petugas</th>
              <th>Hasil</th>
            </tr>
          </thead>
          <tbody>
            {scanLogs.map((s) => (
              <tr key={`${s.at}-${s.orderId}-${s.result}`}>
                <td className="mono">{s.at}</td>
                <td className="mono">{s.orderId}</td>
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
