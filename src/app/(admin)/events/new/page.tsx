import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminVenues } from "@/lib/data/admin-db";
import { NewEventForm } from "@/components/event/NewEventForm";

export const instant = false;
export const metadata = { title: "Event baru" };

export default async function NewEventPage() {
  await requireAdminPage();
  const venues = (await getAdminVenues())
    .filter((v) => v.status === "ACTIVE")
    .map((v) => ({ id: v.id, name: v.name, templates: v.templates.map((t) => ({ id: t.id, name: t.name })) }));

  return (
    <>
      <Link href="/events" className="back-link">← Semua event</Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">Event baru</h1>
          <p className="page-lead">Isi jadwal, venue, periode penjualan, dan kategori tiket pertama.</p>
        </div>
      </div>
      {venues.length === 0 ? (
        <div className="note">Belum ada venue aktif. Aktifkan venue dulu di halaman Venue.</div>
      ) : (
        <NewEventForm venues={venues} />
      )}
    </>
  );
}
