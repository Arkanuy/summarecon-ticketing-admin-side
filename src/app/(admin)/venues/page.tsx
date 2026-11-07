import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminVenues } from "@/lib/data/admin-db";

export const instant = false;
export const metadata = { title: "Venue" };

const TYPE_LABEL: Record<string, string> = {
  INDOOR_ATRIUM: "Atrium dalam",
  OUTDOOR_ALFRESCO: "Area terbuka",
  OUTDOOR_COURTYARD: "Courtyard",
};

export default async function VenuesPage() {
  await requireAdminPage();
  const venues = await getAdminVenues();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Venue</h1>
          <p className="page-lead">
            {venues.length} venue. Ini master data: layout sudah ditetapkan di luar sistem, admin hanya memilih
            area saat menyiapkan event (§3.2).
          </p>
        </div>
      </div>

      <div className="grid g3">
        {venues.map((v) => (
          <Card key={v.id}>
            <div className="event-category">{v.code} · {TYPE_LABEL[v.type] ?? v.type}</div>
            <Link href={`/venues/${v.id}`} className="event-card-title" style={{ marginTop: 8, display: "block" }}>
              {v.name}
            </Link>
            <p className="sub">{v.location}{v.floor ? ` · ${v.floor}` : ""}</p>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <Badge tone={v.status === "ACTIVE" ? "ok" : "muted"}>{v.status}</Badge>
              <Badge tone="muted">{v.templates.length} layout</Badge>
              <Badge tone="muted">{v.eventCount} event</Badge>
            </div>

            <div className="event-card-bottom">
              <span>
                <small>Kapasitas terhitung</small>
                <strong>{v.capacityComputed.toLocaleString("id-ID")}</strong>
              </span>
              <Link href={`/venues/${v.id}`} className="round-link" aria-label={`Detail ${v.name}`}>→</Link>
            </div>
          </Card>
        ))}
      </div>

      <div className="section-head"><h2 className="section-title">Tabel venue</h2></div>
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Venue</th><th>Kode</th><th>Lokasi</th><th>Tipe</th>
              <th className="num">Kapasitas resmi</th><th className="num">Kapasitas terhitung</th>
              <th className="num">Layout</th><th className="num">Event</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {venues.length === 0 ? (
              <tr><td colSpan={9} className="empty">Belum ada venue.</td></tr>
            ) : (
              venues.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Link href={`/venues/${v.id}`} className="t-name row-link">{v.name}</Link>
                    {v.alias ? <div className="sub">{v.alias}</div> : null}
                  </td>
                  <td className="mono">{v.code}</td>
                  <td>{v.location}</td>
                  <td>{TYPE_LABEL[v.type] ?? v.type}</td>
                  <td className="num mono">{v.capacityOfficial?.toLocaleString("id-ID") ?? "—"}</td>
                  <td className="num mono">{v.capacityComputed.toLocaleString("id-ID")}</td>
                  <td className="num mono">{v.templates.length}</td>
                  <td className="num mono">{v.eventCount}</td>
                  <td><Badge tone={v.status === "ACTIVE" ? "ok" : "muted"}>{v.status}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <div className="note">
        <b>Batasan sesuai dokumen §3.2:</b> sistem tidak menyediakan fitur membuat, menggambar, atau mengubah
        layout master venue. Layout setiap venue sudah ditentukan sebelumnya; admin hanya memilih area atau
        kelompok kursi dari layout tersebut saat menyiapkan event.
        <br />
        Kapasitas resmi masih <span className="mono">TBC_NOT_OFFICIALLY_VALIDATED</span> di data contoh, karena itu
        kolom “terhitung” diambil dari jumlah kapasitas section event yang memakai venue ini.
      </div>
    </>
  );
}
