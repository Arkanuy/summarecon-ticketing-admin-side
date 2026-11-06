import { redirect } from "next/navigation";
import { getSession, isAdminUser } from "@/lib/auth/session";

/** Guard untuk Server Component halaman. Redirect ke /login kalau bukan admin. */
export async function requireAdminPage() {
  const user = await getSession();
  if (!isAdminUser(user)) redirect("/login");
  return user;
}
