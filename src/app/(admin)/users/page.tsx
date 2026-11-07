import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { requireAdminPage } from "@/lib/auth/page";
import { getAdminUsers } from "@/lib/data/admin-db";

export const instant = false;
export const metadata = { title: "Pengguna" };

export default async function UsersPage() {
  await requireAdminPage();
  const users = await getAdminUsers();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Pengguna</h1>
          <p className="page-lead">
            {users.length} akun. Satu dashboard, hak akses per role (§4).
          </p>
        </div>
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Nama</th><th>Email</th><th>Telepon</th><th>Role</th><th>Status</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="t-name">{u.name}</td>
                <td className="mono">{u.email}</td>
                <td className="mono">{u.phone}</td>
                <td>{u.role}</td>
                <td>
                  <StatusBadge status={u.active ? "SUCCESS" : "EXPIRED"} label={u.active ? "Aktif" : "Nonaktif"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
