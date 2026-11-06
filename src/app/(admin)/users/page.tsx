import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { staff } from "@/lib/data/admin";

export const metadata = { title: "Pengguna" };

export default function UsersPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pengguna</h1>
          <p className="page-lead">
            Satu dashboard, hak akses per role. Petugas check-in memakai dashboard yang sama (§4).
          </p>
        </div>
        <button type="button" className="button button-primary">+ Undang pengguna</button>
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th></tr>
          </thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id}>
                <td className="t-name">{u.name}</td>
                <td className="mono">{u.email}</td>
                <td>{u.role === "ADMIN" ? "Admin" : "Petugas check-in"}</td>
                <td><StatusBadge status={u.active ? "SUCCESS" : "EXPIRED"} label={u.active ? "Aktif" : "Nonaktif"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
