import Link from "next/link";
import { EventCard } from "@/components/event/EventCard";
import { PageHead } from "@/components/shared/PageHead";
import { Card } from "@/components/ui/Card";
import { VersionBadge } from "@/components/ui/Badge";
import { PublishToggle } from "@/components/event/PublishToggle";
import { events } from "@/lib/data/admin";
import { BOOKING_MODE_LABEL, EVENT_STATUS_LABEL, eventTone, ticketSummary } from "@/lib/utils";

export const metadata = { title: "Event" };

export default function EventsPage() {
  return (
    <>
      <PageHead
        eyebrow="Event Management"
        title={<>Semua <em>event</em></>}
        lead="Membuat, mengubah, dan memublikasikan event. Konfigurasi kursi dan kategori tiket ada di halaman kelola tiap event."
        actions={
          <button type="button" className="button button-primary">
            + Event baru
          </button>
        }
      />

      <div className="event-grid" style={{ marginBottom: 30 }}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} tone={eventTone(event.category)} />
        ))}
      </div>

      <div className="section-head">
        <h2 className="section-title">Daftar ringkas</h2>
      </div>

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
              const s = ticketSummary(event.categories);
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
                  <td className="num mono">
                    {s.sold}/{s.quota}
                  </td>
                  <td>
                    <PublishToggle published={event.published} label={event.name} />
                  </td>
                  <td className="num">
                    <Link href={`/events/${event.id}`} className="button button-secondary button-small">
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
        Alur tambah event mengikuti §7.1 dokumen analisis: venue → jadwal → area kursi → metode booking → kategori dan
        harga → periode penjualan → publikasi. Formulir simpan belum aktif di prototipe.
      </div>
    </>
  );
}
