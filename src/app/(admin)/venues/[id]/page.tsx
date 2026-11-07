import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminVenue } from "@/lib/data/admin-db";

export const instant = false;

const TYPE_LABEL: Record<string, string> = {
  INDOOR_ATRIUM: "Atrium dalam",
  OUTDOOR_ALFRESCO: "Area terbuka",
  OUTDOOR_COURTYARD: "Courtyard",
};

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const venue = await getAdminVenue(id);
  if (!venue) notFound();

  return (
    <>
      <Link href="/venues" className="back-link">← Semua venue</Link>

      <div className="page-head">
        <div>
          <span className="eyebrow"><i className="eyebrow-line" />{venue.code} · {TYPE_LABEL[venue.type] ?? venue.type}</span>
          <h1 className="page-title" style={{ marginTop: 6 }}>{venue.name}</h1>
          <p className="page-lead">{venue.location}{venue.floor ? ` · ${venue.floor}` : ""}</p>
        </div>
        <Badge tone={venue.status === "ACTIVE" ? "ok" : "muted"}>{venue.status}</Badge>
      </div>

      <div className="stats">
        <div className="stat stat-accent">
          <b>{venue.capacityComputed.toLocaleString("id-ID")}</b><span>Kapasitas section</span>
        </div>
        <div className="stat"><b>{venue.capacityOfficial?.toLocaleString("id-ID") ?? "—"}</b><span>Kapasitas resmi</span></div>
        <div className="stat"><b>{venue.layouts.length}</b><span>Layout template</span></div>
        <div className="stat"><b>{venue.eventCount}</b><span>Event</span></div>
      </div>

      {venue.notes ? <div className="note">{venue.notes}</div> : null}

      <div className="section-head"><h2 className="section-title">Layout template</h2></div>
      {venue.layouts.map((l) => (
        <Card key={l.id} style={{ marginBottom: 12 }}>
          <div className="card-head" style={{ marginBottom: 6 }}>
            <div>
              <div className="t-name">{l.name}</div>
              <div className="sub">
                versi {l.version} · {l.status}
                {l.sourcePage ? ` · blueprint halaman ${l.sourcePage}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {l.bookingTypes.map((b) => (
                <Badge key={b} tone="muted">{b.replaceAll("_", " ").toLowerCase()}</Badge>
              ))}
            </div>
          </div>
          {l.elements.length ? (
            <table className="table">
              <thead><tr><th>Elemen</th><th>Tipe</th><th>Bisa diberi tiket</th></tr></thead>
              <tbody>
                {l.elements.slice(0, 12).map((el, i) => (
                  <tr key={`${l.id}-${i}`}>
                    <td>{el.name ?? "—"}</td>
                    <td className="mono">{(el.element_type ?? "—").toLowerCase()}</td>
                    <td>{el.ticketable ? "Ya" : "Tidak"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="sub">Template ini tidak menyimpan daftar elemen.</p>
          )}
        </Card>
      ))}

      <div className="section-head"><h2 className="section-title">Event di venue ini</h2></div>
      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Event</th><th>Jadwal</th><th>Status</th><th className="num">Kapasitas</th><th className="num">Terjual</th><th className="num">Kategori</th></tr>
          </thead>
          <tbody>
            {venue.events.length === 0 ? (
              <tr><td colSpan={6} className="empty">Belum ada event memakai venue ini.</td></tr>
            ) : (
              venue.events.map((e) => (
                <tr key={e.id}>
                  <td><Link href={`/events/${e.id}`} className="t-name row-link">{e.name}</Link></td>
                  <td className="mono">{e.startAt.toISOString().slice(0, 10)}</td>
                  <td>{e.status}</td>
                  <td className="num mono">{e.capacity}</td>
                  <td className="num mono">{e.sold}</td>
                  <td className="num mono">{e.categories}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="note">
        Layout di atas bersifat baca-saja. Membuat atau mengubah denah master venue di luar lingkup sistem (§3.2);
        perubahan denah dilakukan di sumber layout, bukan di dashboard.
      </div>
    </>
  );
}
