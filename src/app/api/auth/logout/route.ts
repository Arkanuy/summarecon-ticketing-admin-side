import { ok } from "@/lib/api";
import { clearedCookie, getSession, revokeSession } from "@/lib/auth/session";

/**
 * POST /api/auth/logout — cabut sesi di server, lalu hapus cookie.
 * Body/query `audience` menentukan sesi mana yang dicabut; tanpa itu keduanya.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const raw = body?.audience ?? new URL(request.url).searchParams.get("audience");
  const audience = raw === "ADMIN" || raw === "CUSTOMER" ? raw : undefined;

  const user = await getSession(request, audience);
  if (user) await revokeSession(user.sessionId);

  const response = ok({ logged_out: true, audience: audience ?? "ALL" });
  if (!audience || audience === "ADMIN") response.cookies.set(clearedCookie("ADMIN"));
  if (!audience || audience === "CUSTOMER") response.cookies.set(clearedCookie("CUSTOMER"));
  return response;
}
