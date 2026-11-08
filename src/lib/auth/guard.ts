import { redirect } from "next/navigation";
import { getSession, isAdminUser, isCustomer, type SessionUser } from "@/lib/auth/session";
import { fail } from "@/lib/api";

type Guarded = { user: SessionUser } | { response: Response };

/** Wajib login admin. */
export async function requireAdmin(request?: Request): Promise<Guarded> {
  const user = await getSession(request, "ADMIN");
  if (!user) return { response: fail(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu") };
  if (!isAdminUser(user)) return { response: fail(403, "FORBIDDEN", "Akun ini bukan admin") };
  return { user };
}

/** Wajib login customer (API sisi peserta). */
export async function requireCustomer(request?: Request): Promise<Guarded> {
  const user = await getSession(request, "CUSTOMER");
  if (!user) return { response: fail(401, "UNAUTHENTICATED", "Silakan masuk terlebih dahulu") };
  if (!isCustomer(user)) return { response: fail(403, "FORBIDDEN", "Endpoint ini untuk peserta") };
  return { user };
}

/**
 * Pembaca sesi untuk halaman (Server Component).
 * `use cache: private` — pola resmi Next saat cacheComponents aktif: boleh membaca cookie,
 * hasil per-request tidak dibagi ke pengguna lain, dan redirect tidak ikut ter-cache.
 */
export async function getCurrentAdmin(): Promise<SessionUser> {
  const user = await getSession(undefined, "ADMIN");
  if (!isAdminUser(user)) redirect("/login");
  return user;
}

/** Versi lembut: null kalau bukan admin (dipakai halaman login). */
export async function currentAdmin(): Promise<SessionUser | null> {
  const user = await getSession(undefined, "ADMIN");
  return isAdminUser(user) ? user : null;
}
