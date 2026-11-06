import { ok } from "@/lib/api";
import { clearedCookie, getSession, revokeSession } from "@/lib/auth/session";

/** POST /api/auth/logout — cabut sesi di server, lalu hapus cookie. */
export async function POST(request: Request) {
  const user = await getSession(request);
  if (user) await revokeSession(user.sessionId);

  const response = ok({ logged_out: true });
  response.cookies.set(clearedCookie("ADMIN"));
  response.cookies.set(clearedCookie("CUSTOMER"));
  return response;
}
