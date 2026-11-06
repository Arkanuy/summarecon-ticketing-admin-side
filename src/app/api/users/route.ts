import { prisma } from "@/lib/db";
import { ok } from "@/lib/api";

/** GET /api/users — akun internal & role. */
export async function GET() {
  const users = await prisma.user.findMany({ include: { role: true }, orderBy: { createdAt: "asc" } });
  return ok(
    users.map((u) => ({
      user_id: u.id,
      full_name: u.fullName,
      email: u.email,
      phone_number: u.phoneNumber,
      role: u.role.roleName,
      account_status: u.accountStatus,
      created_at: u.createdAt,
    })),
  );
}
