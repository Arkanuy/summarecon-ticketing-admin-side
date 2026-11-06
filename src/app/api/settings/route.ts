import { prisma } from "@/lib/db";
import { ok } from "@/lib/api";

/** GET /api/settings — aturan sistem (hold 10 menit, pending 7 menit, refund H-1, dll). */
export async function GET() {
  const rows = await prisma.systemSetting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  const grouped: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    grouped[row.group ?? "other"] ??= {};
    try {
      grouped[row.group ?? "other"][row.key] = JSON.parse(row.value);
    } catch {
      grouped[row.group ?? "other"][row.key] = row.value;
    }
  }
  return ok(grouped);
}
