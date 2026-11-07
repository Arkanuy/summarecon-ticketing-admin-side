import { prisma } from "@/lib/db";
import { parseQrToken, looksLikeLegacyToken } from "@/lib/qr/token";

export type Resolved =
  | { ok: true; eTicket: NonNullable<Awaited<ReturnType<typeof findETicket>>> }
  | { ok: false; code: string; message: string };

async function findETicket(token: string) {
  return prisma.eTicket.findUnique({
    where: { qrTokenHash: token },
    include: { order: { include: { tickets: true } }, event: true },
  });
}

/**
 * Cocokkan isi QR ke database.
 * Token bertanda tangan diverifikasi dulu (anti palsu); token lama sekadar dicari apa adanya.
 */
export async function resolveQrToken(token: string): Promise<Resolved> {
  if (!token) return { ok: false, code: "QR_KOSONG", message: "QR tidak berisi data" };

  if (!looksLikeLegacyToken(token)) {
    const parsed = parseQrToken(token);
    if (!parsed.ok) {
      const msg =
        parsed.reason === "SIGNATURE"
          ? "QR tidak sah (tanda tangan tidak cocok)"
          : "Format QR tidak dikenali";
      return { ok: false, code: "QR_TIDAK_SAH", message: msg };
    }
  }

  const eTicket = await findETicket(token);
  if (!eTicket) return { ok: false, code: "QR_TIDAK_DIKENAL", message: "Bukan tiket event ini" };
  if (eTicket.invalidatedAt) return { ok: false, code: "QR_DINONAKTIFKAN", message: "Tiket sudah dibatalkan atau direfund" };
  return { ok: true, eTicket };
}
