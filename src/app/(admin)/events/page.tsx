import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { VersionBadge, Badge } from "@/components/ui/Badge";
import { PageHead } from "@/components/shared/PageHead";
import { PublishToggle } from "@/components/event/PublishToggle";
import { events } from "@/lib/data/admin";
import { BOOKING_MODE_LABEL, EVENT_STATUS_LABEL, ticketSummary } from "@/lib/utils";

export const metadata = { title: "Event" };

export default function EventsPage() {
  return (
    <>
      <PageHead
        title="Event Management"
        lead="Membuat, mengubah, dan memublikasikan event. Konfigurasi kursi dan kategori tiket ada di halaman kelola tiap event."
        actions={
          <button className="btn btn-primary btn-sm" type="button">
            + Event baru
          </button>
        }
      />

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Jadwal</th>
              <th>Metode</th>
              <th>Status</th>
              <th className="num">Terjual</th>
              <th>Publikasi</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const summary = ticketSummary(event.categories);
              const pct = Math.round((summary.sold / summary.quota) * 100);
              return (
                <tr key={event.id}>
                  <td>
                    <div className="t-name">{event.name}</div>
                    <div className="sub">{event.category}</div>
                  </td>
                  <td>
                    {event.date}
                    <div className="sub">{event.time}</div>
                  </td>
                  <td>{BOOKING_MODE_LABEL[event.bookingMode]}</td>
                  <td>
                    <VersionBadge status={event.status} label={EVENT_STATUS_LABEL[event.status]} />
                  </td>
                  <td className="num">
                    <div className="mono">
                      {summary.sold}/{summary.quota}
                    </div>
                    <div className="bar" style={{ width: 84, marginLeft: "auto" }}>
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td>
                    <PublishToggle published={event.published} label={event.name} />
                  </td>
                  <td className="num">
                    <Link href={`/events/${event.id}`} className="btn btn-outline btn-sm">
                      Kelola
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="note">
        Alur tambah event mengikuti §7.1: pilih venue → jadwal → area kursi → metode booking → kategori dan harga →
        periode penjualan → publikasi. <Badge tone="muted">Formulir simpan belum aktif</Badge>
      </div>
    </>
  );
}
