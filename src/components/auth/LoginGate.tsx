import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth/guard";

/** Server Component: hanya membaca sesi. Tidak merender UI. */
export async function LoginGate() {
  const admin = await currentAdmin();
  if (admin) redirect("/");
  return null;
}
