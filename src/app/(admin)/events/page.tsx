import Link from "next/link";
import { VersionBadge, Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminEvents } from "@/lib/data/admin-db";
import { EVENT_STATUS_LABEL, rupiah } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Event" };

const MODE_LABEL: Record<string, string> = {
  BOOK_BY_SEAT: "Book by Seat",
  BOOK_BY_QUOTA: "Book by Quota",
  STANDING: "Standing",
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");

export default async function EventsPage() {
  await requireAdminPage();
  const events = await getAdminEvents();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Event</h1>
          <p className="page-lead">
            {events.length} event di database. Konfigurasi kursi, kategori, dan harga dikelola per event (§7.1).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/reports" className="button button-secondary">Laporan</Link>
          <Link href="/events/new" className="button button-primary">+ Event baru</Link>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 0 }}>
        <h2 className="section-title">Ringkasan</h2>
        <span className="sub">{events.length} event</span>
      </div>

      {events.length === 0 ? (
        <Card><p className="sub">Belum ada event. Tambahkan lewat seed atau API.</p></Card>
      ) : (
        events.map((e) => {
          const pct = e.quota ? Math.round((e.sold / e.quota) * 100) : 0;
          return (
            <div className="event-row" key={e.id}>
              <div className="date-chip">
                <b>{e.startAt.getDate()}</b>
                <span>{e.startAt.toLocaleDateString("id-ID", { month: "short" }).toUpperCase()}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <Link href={`/events/${e.id}`} className="event-row-title">{e.name}</Link>
                <p className="event-row-meta">
                  {e.venueName} · {fmtDate(e.startAt)} {fmtTime(e.startAt)} · mulai {rupiah(e.priceFrom)}
                </p>
              </div>
              <div>
                <div className="mono" style={{ fontSize: 11.5 }}>{e.sold}/{e.quota}</div>
                <div className="bar" style={{ marginTop: 5 }}><i style={{ width: `${pct}%` }} /></div>
              </div>
              <div><VersionBadge status={e.status} label={EVENT_STATUS_LABEL[e.status as keyof typeof EVENT_STATUS_LABEL] ?? e.status} /></div>
              <div className="event-row-side">
                <ToggleSwitch
                  on={e.published}
                  label={`Publikasikan ${e.name}`}
                  endpoint={`/api/events/${e.id}`}
                  bodyKey="published"
                  onText={`"${e.name}" dipublikasikan.`}
                  offText={`"${e.name}" ditarik ke draf.`}
                  confirmOn={{ title: `Publikasikan "${e.name}"?`, description: "Event tampil ke peserta sesuai periode penjualan." }}
                  confirmOff={{ title: `Tarik "${e.name}" dari publikasi?`, description: "Kembali ke draf, disembunyikan dari peserta." }}
                />
                <Link href={`/events/${e.id}`} className="button button-secondary button-small">Kelola</Link>
              </div>
            </div>
          );
        })
      )}

      <div className="section-head">
        <h2 className="section-title">Tabel lengkap</h2>
      </div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Jadwal</th>
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
        Angka di halaman ini dibaca langsung dari database, bukan dari data contoh. Menambah event lewat API
        langsung terlihat setelah halaman dimuat ulang.
      </div>
    </>
  );
}
