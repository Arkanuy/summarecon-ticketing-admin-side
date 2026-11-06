import { PetalFan } from "@/components/shared/PetalMark";
import { Card } from "@/components/ui/Card";
import { events, venues } from "@/lib/data/admin";

export const metadata = { title: "Venue" };

export default function VenuesPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Venue</h1>
          <p className="page-lead">
            Layout sudah ditetapkan di luar sistem. Admin hanya memilih area saat menyiapkan event (§3.2).
          </p>
        </div>
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Venue</th><th>Kota</th><th className="num">Kapasitas</th><th className="num">Event</th><th /></tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.id}>
                <td className="t-name">{v.name}</td>
                <td>{v.city}</td>
                <td className="num mono">{v.capacity.toLocaleString("id-ID")}</td>
                <td className="num mono">{events.filter((e) => e.venueId === v.id).length}</td>
                <td className="num"><PetalFan width={2} stroke="var(--purple)" className="venue-petal" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
