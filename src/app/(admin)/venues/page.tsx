import { Card } from "@/components/ui/Card";
import { PageHead } from "@/components/shared/PageHead";
import { Petal } from "@/components/shared/PetalMark";
import { events, venues } from "@/lib/data/admin";

export const metadata = { title: "Venue" };

export default function VenuesPage() {
  return (
    <>
      <PageHead title="Venue Management" lead="Master venue dan layout tetap. Layout venue tidak dibuat atau diubah dari sistem (§3.2)." />
      <div className="grid g3">
        {venues.map((venue) => {
          const used = events.filter((e) => e.venueId === venue.id).length;
          return (
            <Card key={venue.id}>
              <div className="overline">{venue.city.toUpperCase()}</div>
              <h3 style={{ fontSize: 18, margin: "6px 0 2px", fontFamily: '"Plus Jakarta Sans"' }}>{venue.name}</h3>
              <div className="mono muted">{venue.capacity.toLocaleString("id-ID")} kursi</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                <span className="sub">{used} event memakai venue</span>
                <Petal variant="bud" filled={false} stroke="var(--primary)" style={{ width: 44, height: 30, opacity: 0.7 }} />
              </div>
            </Card>
          );
        })}
      </div>
      <div className="note">
        Admin hanya memilih area atau kelompok kursi dari layout yang tersedia saat menyiapkan event.
      </div>
    </>
  );
}
