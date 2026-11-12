import Link from "next/link";
import { VersionBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EventRow } from "@/components/event/EventRow";
import { EventFilter } from "@/components/event/EventFilter";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminEvents } from "@/lib/data/admin-db";
import { EVENT_STATUS_LABEL, type EventStatus } from "@/lib/event-status";

export const instant = false;
export const metadata = { title: "Event" };

const MODE_LABEL: Record<string, string> = {
  BOOK_BY_SEAT: "Book by Seat",
  BOOK_BY_QUOTA: "Book by Quota",
  STANDING: "Standing",
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).replace(":", ".");

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  await requireAdminPage();
  const { status: statusFilter, from, to } = await searchParams;

  const all = await getAdminEvents();

  const fromDate = from ? new Date(`${from}T00:00:00+07:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59+07:00`) : null;

  /* Filter diterapkan di sini, bukan di SQL: getAdminEvents juga dipakai dashboard,
     dan jumlah event puluhan sehingga satu round-trip lebih murah dari dua fungsi. */
  const events = all.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (fromDate && e.startAt < fromDate) return false;
    if (toDate && e.startAt > toDate) return false;
    return true;
  });

  const statusOptions = (Object.keys(EVENT_STATUS_LABEL) as EventStatus[]).map((value) => ({
    value,
    label: EVENT_STATUS_LABEL[value],
    count: all.filter((e) => e.status === value).length,
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Event</h1>
          <p className="page-lead">
            {events.length}
            {statusFilter || from || to ? ` dari ${all.length}` : ""} event. Alur status: Draf, Terbit,
            Buka penjualan. Peserta hanya melihat event yang sudah terbit.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/reports" className="button button-secondary">Laporan</Link>
          <Link href="/events/new" className="button button-primary">+ Event baru</Link>
        </div>
      </div>

      <EventFilter
        status={statusFilter ?? ""}
        from={from ?? ""}
        to={to ?? ""}
        statusOptions={statusOptions}
      />

      {events.length === 0 ? (
        <Card>
          <p className="sub">
            {statusFilter || from || to
              ? "Tidak ada event yang cocok dengan filter ini."
              : "Belum ada event. Tambahkan lewat tombol Event baru."}
          </p>
        </Card>
      ) : (
        events.map((e) => <EventRow key={e.id} event={e} />)
      )}

      <div className="section-head">
        <h2 className="section-title">Tabel lengkap</h2>
        <span className="sub">{events.length} baris</span>
      </div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Venue</th>
              <th>Metode</th>
              <th>Status</th>
              <th className="num">Terjual</th>
              <th className="num">Kuota</th>
              <th>Publikasi</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="t-name">
                    <Link href={`/events/${e.id}`} className="row-link">{e.name}</Link>
                  </div>
                  <div className="sub">{e.code}</div>
                </td>
                <td>
                  {fmtDate(e.startAt)}
                  <div className="sub">{fmtTime(e.startAt)}</div>
                </td>
                <td>
                  {fmtDate(e.endAt)}
                  <div className="sub">{fmtTime(e.endAt)}</div>
                </td>
                <td>{e.venueName}</td>
                <td>{MODE_LABEL[e.bookingMode] ?? e.bookingMode}</td>
                <td><VersionBadge status={e.status} label={EVENT_STATUS_LABEL[e.status as keyof typeof EVENT_STATUS_LABEL] ?? e.status} /></td>
                <td className="num mono">{e.sold}</td>
                <td className="num mono">{e.quota}</td>
                <td>
                  {e.published ? <Badge tone="ok">Publik</Badge> : <Badge tone="muted">Draf</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="note">
        &quot;Terbit&quot; berarti event sudah terlihat peserta. Penjualan baru aktif setelah status
        &quot;Buka penjualan&quot;. Filter tanggal memakai tanggal mulai acara (WIB).
      </div>
    </>
  );
}
