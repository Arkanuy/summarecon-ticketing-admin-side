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
        title="Check-in Management"
        lead="Scan QR e-ticket. Satu QR per order, jumlah scan dibatasi jumlah tiket valid dalam order (§8.6)."
      />

      <QrScanner
        orders={orders.map((o) => ({ id: o.id, buyer: o.buyer, paymentStatus: o.paymentStatus }))}
      />

      <h2 className="section-title" style={{ marginTop: 28 }}>
        Riwayat scan terbaru
      </h2>
      <Card flush style={{ marginTop: 12 }}>
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
            {scanLogs.map((scan) => (
              <tr key={`${scan.at}-${scan.orderId}-${scan.result}`}>
                <td className="mono">{scan.at}</td>
                <td className="mono">{scan.orderId}</td>
                <td className="mono">{scan.ticketId ?? "—"}</td>
                <td>{scan.officer}</td>
                <td>
                  <StatusBadge
                    status={scan.result === "VALID" ? "SUCCESS" : scan.result === "LIMIT" ? "PENDING" : "FAILED"}
                    label={scan.result === "VALID" ? "Valid" : scan.result === "LIMIT" ? "Batas scan" : "Tidak valid"}
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
