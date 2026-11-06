import { z } from "zod";
import { prisma } from "@/lib/db";
import { created, badRequest, conflict } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession, sessionCookie } from "@/lib/auth/session";

const schema = z.object({
  full_name: z.string().min(2).max(80),
  email: z.string().email(),
  phone_number: z.string().min(8).max(20).optional(),
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
});

/**
 * POST /api/auth/register — pendaftaran peserta (customer).
 * Admin dibuat oleh admin lain, bukan lewat endpoint publik ini.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Data pendaftaran tidak valid", parsed.error.flatten());
  const { full_name, email, phone_number, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return conflict("Email sudah terdaftar", { field: "email" });

  const role = await prisma.role.findUnique({ where: { roleId: "ROLE-CUSTOMER" } });
  if (!role) return badRequest("Role CUSTOMER belum tersedia di database");

  const user = await prisma.user.create({
    data: {
      id: `USR-CUS-${Date.now().toString(36).toUpperCase()}`,
      roleId: "ROLE-CUSTOMER",
      fullName: full_name,
      email,
      phoneNumber: phone_number ?? null,
      passwordHash: await hashPassword(password),
      accountStatus: "ACTIVE",
      createdAt: new Date(),
    },
  });

  const { token, expiresAt } = await createSession(user.id, {
    audience: "CUSTOMER",
    ip: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  const response = created({
    user: { user_id: user.id, name: user.fullName, email: user.email, role: "CUSTOMER" },
    expires_at: expiresAt,
  });
  response.cookies.set(sessionCookie("CUSTOMER", token, expiresAt));
  return response;
}
