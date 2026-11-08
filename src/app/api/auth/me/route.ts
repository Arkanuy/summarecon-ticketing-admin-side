import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/session";

/**
 * GET /api/auth/me — siapa yang sedang login.
 *
 * `?audience=ADMIN|CUSTOMER` menentukan cookie mana yang dibaca. Dulu endpoint ini
 * memakai cookie apa pun yang ada, sehingga customer side (yang memanggil tanpa
 * parameter) membaca sesi admin ketika keduanya login di browser yang sama.
 */
export async function GET(request: Request) {
  const audienceParam = new URL(request.url).searchParams.get("audience");
  const audience =
    audienceParam === "ADMIN" || audienceParam === "CUSTOMER" ? audienceParam : undefined;

  const user = await getSession(request, audience);
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
