import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { PageHead } from "@/components/shared/PageHead";
import { staff } from "@/lib/data/admin";

export const metadata = { title: "Pengguna" };

export default function UsersPage() {
  return (
    <>
      <PageHead
        title="User Management"
        lead="Satu dashboard, hak akses per role. Petugas check-in memakai dashboard yang sama dengan akses terbatas (§4)."
      />
      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((user) => (
              <tr key={user.id}>
                <td className="t-name">{user.name}</td>
                <td className="mono">{user.email}</td>
                <td>{user.role === "ADMIN" ? "Admin" : "Petugas check-in"}</td>
                <td>
                  <StatusBadge status={user.active ? "SUCCESS" : "EXPIRED"} label={user.active ? "Aktif" : "Nonaktif"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
