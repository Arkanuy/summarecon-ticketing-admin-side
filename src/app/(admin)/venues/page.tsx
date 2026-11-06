import { PageHead } from "@/components/shared/PageHead";
import { PetalFan } from "@/components/shared/PetalMark";
import { Card } from "@/components/ui/Card";
import { events, venues } from "@/lib/data/admin";

export const metadata = { title: "Venue" };

export default function VenuesPage() {
  return (
    <>
      <PageHead
        eyebrow="Venue Management"
        title={<>Master <em>venue</em></>}
        lead="Layout venue sudah ditetapkan di luar sistem. Admin hanya memilih area atau kelompok kursi saat menyiapkan event (§3.2)."
      />
      <div className="grid g3">
        {venues.map((v) => {
          const used = events.filter((e) => e.venueId === v.id).length;
          return (
            <Card key={v.id}>
              <div className="event-category">
                {v.city.toUpperCase()}
              </div>
              <h3 className="event-card-title" style={{ marginTop: 10 }}>{v.name}</h3>
              <p className="sub mono">{v.capacity.toLocaleString("id-ID")} kursi</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <span className="sub">{used} event</span>
                <PetalFan width={2.5} stroke="var(--purple)" className="venue-petal" />
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
