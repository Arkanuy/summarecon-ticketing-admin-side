import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/session";

/** GET /api/auth/me — siapa yang sedang login. */
export async function GET(request: Request) {
  const user = await getSession(request);
  if (!user) return fail(401, "UNAUTHENTICATED", "Belum login");
  return ok({
    user_id: user.userId,
    name: user.name,
    email: user.email,
    role: user.roleName,
    audience: user.audience,
    session_id: user.sessionId,
  });
}
