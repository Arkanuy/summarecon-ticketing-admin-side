import Link from "next/link";
import { EventRow } from "@/components/event/EventRow";
import { Card } from "@/components/ui/Card";
import { VersionBadge } from "@/components/ui/Badge";
import { PublishToggle } from "@/components/event/PublishToggle";
import { events } from "@/lib/data/admin";
import { BOOKING_MODE_LABEL, EVENT_STATUS_LABEL, ticketSummary } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth/page";

/* Halaman membaca sesi (runtime), jadi render-nya memblokir by design. */
export const instant = false;

export const metadata = { title: "Event" };

export default async function EventsPage() {
  await requireAdminPage();
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Event</h1>
          <p className="page-lead">
            Konfigurasi kursi, kategori, harga, dan periode jual dikelola dari halaman tiap event (§7.1).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="button button-secondary">Impor</button>
          <button type="button" className="button button-primary">+ Event baru</button>
        </div>
      </div>

      <div className="section-head" style={{ marginTop: 0 }}>
        <h2 className="section-title">Ringkasan</h2>
        <span className="sub">{events.length} event</span>
      </div>
      {events.map((e) => <EventRow key={e.id} event={e} />)}

      <div className="section-head">
        <h2 className="section-title">Tabel lengkap</h2>
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
              <th className="num">Kuota</th>
              <th>Publikasi</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const s = ticketSummary(e.categories);
              return (
                <tr key={e.id}>
                  <td>
                    <div className="t-name">{e.name}</div>
                    <div className="sub">{e.category}</div>
                  </td>
                  <td>
                    {e.date}
                    <div className="sub">{e.time}</div>
                  </td>
                  <td>{BOOKING_MODE_LABEL[e.bookingMode]}</td>
                  <td><VersionBadge status={e.status} label={EVENT_STATUS_LABEL[e.status]} /></td>
                  <td className="num mono">{s.sold}</td>
                  <td className="num mono">{s.quota}</td>
                  <td><PublishToggle published={e.published} label={e.name} /></td>
                  <td className="num">
                    <Link href={`/events/${e.id}`} className="button button-secondary button-small">Kelola</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="note">
        Formulir tambah event belum aktif di prototipe. Alurnya: venue → jadwal → area kursi → metode booking →
        kategori dan harga → periode penjualan → publikasi.
      </div>
    </>
  );
}
