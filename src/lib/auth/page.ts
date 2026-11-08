import { redirect } from "next/navigation";
import { getSession, isAdminUser } from "@/lib/auth/session";

/** Guard untuk Server Component halaman. Redirect ke /login kalau bukan admin. */
export async function requireAdminPage() {
  /* audience wajib: jangan sampai cookie peserta dipakai membuka halaman admin. */
  const user = await getSession(undefined, "ADMIN");
  if (!isAdminUser(user)) redirect("/login");
  return user;
}
