import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, badRequest, fail } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, roleAudience, sessionCookie } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  audience: z.enum(["ADMIN", "CUSTOMER"]).default("ADMIN"),
});

/** POST /api/auth/login — satu pintu untuk admin & customer, dibedakan lewat `audience`. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Email dan password wajib diisi", parsed.error.flatten());
  const { email, password, audience } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!user) return fail(401, "INVALID_CREDENTIALS", "Email atau password salah");

  const matches = await verifyPassword(password, user.passwordHash);
  if (!matches) return fail(401, "INVALID_CREDENTIALS", "Email atau password salah");

  if (user.accountStatus !== "ACTIVE") return fail(403, "ACCOUNT_INACTIVE", "Akun belum aktif atau sudah dinonaktifkan");

  const actualAudience = roleAudience(user.roleId);
  if (actualAudience !== audience) {
    return fail(403, "WRONG_PORTAL", audience === "ADMIN" ? "Akun ini bukan akun admin" : "Akun ini bukan akun peserta");
  }

  const { token, expiresAt } = await createSession(user.id, {
    audience,
    ip: request.headers.get("x-forwarded-for"),
    userAgent: request.headers.get("user-agent"),
  });

  const response = ok({
    user: { user_id: user.id, name: user.fullName, email: user.email, role: user.role.roleName },
    expires_at: expiresAt,
  });
  response.cookies.set(sessionCookie(audience, token, expiresAt));
  return response;
}
