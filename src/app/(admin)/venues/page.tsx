import { Card } from "@/components/ui/Card";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminVenues } from "@/lib/data/admin-db";

export const instant = false;
export const metadata = { title: "Venue" };

export default async function VenuesPage() {
  await requireAdminPage();
  const venues = await getAdminVenues();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Venue</h1>
          <p className="page-lead">
            {venues.length} venue di database. Layout sudah ditetapkan di luar sistem (§3.2).
          </p>
        </div>
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Venue</th><th>Lokasi</th><th>Tipe</th><th className="num">Kapasitas</th><th className="num">Layout</th><th className="num">Event</th></tr>
          </thead>
          <tbody>
            {venues.length === 0 ? (
              <tr><td colSpan={6} className="empty">Belum ada venue.</td></tr>
            ) : (
              venues.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div className="t-name">{v.name}</div>
                    <div className="sub">{v.code}</div>
                  </td>
                  <td>{v.city}</td>
                  <td>{v.type}</td>
                  <td className="num mono">{v.capacity ? v.capacity.toLocaleString("id-ID") : "—"}</td>
                  <td className="num mono">{v.templateCount}</td>
                  <td className="num mono">{v.eventCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
