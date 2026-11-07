import Link from "next/link";
import { prisma } from "@/lib/db";
import { CheckinScanner } from "@/components/checkin/CheckinScanner";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { requireAdminPage } from "@/lib/auth/page";

/* Halaman membaca sesi (runtime), jadi render-nya memblokir by design. */
export const instant = false;

export const metadata = { title: "Check-in" };

export default async function CheckinPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  await requireAdminPage();
  const { event: eventParam } = await searchParams;

  /* Event yang punya penjualan berjalan dipakai sebagai default pemindaian. */
  const events = await prisma.event.findMany({
    orderBy: { startAt: "desc" },
    select: { id: true, eventName: true, eventStatus: true },
  });
  const active =
    events.find((e) => e.id === eventParam) ??
    events.find((e) => e.eventStatus === "SALES_OPEN") ??
    events[0];

  const recent = active
    ? await prisma.checkinRecord.findMany({
        where: { eventId: active.id },
        orderBy: { scannedAt: "desc" },
        take: 20,
        include: { ticket: true },
      })
    : [];

  const summary = active
    ? await prisma.eTicket.aggregate({
        where: { eventId: active.id },
        _sum: { successfulScanCount: true },
        _count: true,
      })
    : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Check-in</h1>
          <p className="page-lead">
            Satu QR per order. Setiap scan mengunci satu tiket; QR berhenti berlaku setelah jumlah tiket valid terpakai.
          </p>
        </div>
      </div>

      {events.length > 1 ? (
        <div className="chips" style={{ marginBottom: 14 }}>
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/checkin?event=${e.id}`}
              className="chip"
              aria-pressed={e.id === active?.id}
            >
              {e.eventName}
            </Link>
          ))}
        </div>
      ) : null}

      {active ? (
        <CheckinScanner eventId={active.id} eventName={active.eventName} />
      ) : (
        <Card>
          <p className="sub">Belum ada event untuk dipindai.</p>
        </Card>
      )}

      <div className="section-head">
        <h2 className="section-title">Riwayat scan</h2>
        <span className="sub">
          {summary ? `${summary._sum.successfulScanCount ?? 0} tiket masuk · ${summary._count} QR terbit` : "—"}
        </span>
      </div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Order</th>
              <th>Tiket</th>
              <th>Peserta</th>
              <th>Hasil</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  Belum ada scan untuk event ini.
                </td>
              </tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.scannedAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="mono">
                    <Link href={`/orders/${r.orderId}`} className="row-link">
                      {r.orderId}
                    </Link>
                  </td>
                  <td className="mono">{r.ticketId ?? "—"}</td>
                  <td>{r.ticket?.participantName ?? "—"}</td>
                  <td>
                    <StatusBadge
                      status={r.scanResult === "SUCCESS" ? "SUCCESS" : r.scanResult === "REJECTED_LIMIT" ? "PENDING" : "FAILED"}
                      label={
                        r.scanResult === "SUCCESS"
                          ? `Scan ${r.scanSequence}`
                          : r.scanResult === "REJECTED_LIMIT"
                            ? "Batas scan"
                            : "Tidak valid"
                      }
                    />
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
