import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireAdminPage } from "@/lib/auth/page";
import { DbViewer } from "@/components/admin/DbViewer";

export const instant = false;
export const metadata = { title: "API & Data" };

const ENDPOINTS: { group: string; items: { method: string; path: string; note: string }[] }[] = [
  {
    group: "Data & penampil",
    items: [
      { method: "GET", path: "/api/admin/db?table=venues", note: "Baca satu tabel apa adanya (admin)" },
      { method: "GET", path: "/api/events", note: "Semua event" },
      { method: "GET", path: "/api/venues", note: "Semua venue + layout" },
      { method: "GET", path: "/api/bookings", note: "Semua order" },
      { method: "GET", path: "/api/refunds", note: "Semua refund" },
      { method: "GET", path: "/api/users", note: "Akun + role" },
      { method: "GET", path: "/api/dashboard", note: "Ringkasan angka" },
    ],
  },
  {
    group: "Event & tiket",
    items: [
      { method: "GET", path: "/api/events/:id", note: "Detail event + section + kategori" },
      { method: "GET", path: "/api/events/:id/tickets?q=&status=&attendance=", note: "Cari tiket hari-H" },
      { method: "GET", path: "/api/events/:id/attendance", note: "Ringkasan kehadiran" },
      { method: "GET", path: "/api/events/:id/seats", note: "Denah kursi" },
      { method: "POST", path: "/api/events/:id/seats/block", note: "Blokir kursi" },
      { method: "DELETE", path: "/api/events/:id/seats/block?seat_id=", note: "Lepas blokir" },
    ],
  },
  {
    group: "Harga",
    items: [
      { method: "GET", path: "/api/ticket-categories/:id/prices", note: "Harga bertingkat + yang berlaku" },
      { method: "POST", path: "/api/ticket-categories/:id/prices", note: "Tambah periode promo" },
      { method: "DELETE", path: "/api/ticket-categories/:id/prices?tier_id=", note: "Hapus periode" },
    ],
  },
  {
    group: "Customer & QR",
    items: [
      { method: "POST", path: "/api/auth/register", note: "Daftar peserta" },
      { method: "POST", path: "/api/auth/login", note: "Login (audience ADMIN/CUSTOMER)" },
      { method: "GET", path: "/api/customer/orders", note: "Order milik sendiri" },
      { method: "GET", path: "/api/customer/orders/:id/qr", note: "Terbitkan QR (JSON + data_url)" },
      { method: "GET", path: "/api/customer/orders/:id/qr?format=png", note: "QR sebagai PNG" },
    ],
  },
  {
    group: "Check-in",
    items: [
      { method: "GET", path: "/api/checkin/public", note: "Daftar event (header x-scan-code)" },
      { method: "POST", path: "/api/checkin/public", note: "Scan QR dari perangkat petugas" },
      { method: "POST", path: "/api/checkin", note: "Scan QR dengan sesi admin" },
    ],
  },
];

export default async function ApiDocsPage() {
  await requireAdminPage();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">API & Data</h1>
          <p className="page-lead">
            Semua endpoint dan isi database dalam satu layar. Penampil di bawah membaca SQLite lewat API yang sama
            dengan yang dipakai aplikasi.
          </p>
        </div>
      </div>

      <DbViewer initialTables={["venues", "events", "tickets", "orders", "e_tickets"]} />

      <div className="section-head"><h2 className="section-title">Daftar endpoint</h2></div>
      {ENDPOINTS.map((g) => (
        <Card key={g.group} style={{ marginBottom: 12 }}>
          <div className="overline" style={{ marginBottom: 8 }}>{g.group}</div>
          <table className="table">
            <thead><tr><th style={{ width: 70 }}>Method</th><th>Path</th><th>Keterangan</th></tr></thead>
            <tbody>
              {g.items.map((e) => (
                <tr key={e.path + e.method}>
                  <td>
                    <span className={`method method-${e.method.toLowerCase()}`}>{e.method}</span>
                  </td>
                  <td className="mono">{e.path}</td>
                  <td className="sub">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}

      <div className="note">
        Dokumentasi lengkap (contoh request, kode error, alur QR) ada di repo:{" "}
        <span className="mono">docs/api-reference.md</span> · <span className="mono">docs/lihat-data-sqlite.md</span> ·{" "}
        <Link href="/scan" className="row-link">halaman scan petugas</Link>
      </div>
    </>
  );
}
