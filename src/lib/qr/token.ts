import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Token QR e-ticket.
 * Format:  TKT.<orderCode>.<random>.<sig>
 * - random : 16 byte acak (base64url) supaya tidak bisa ditebak
 * - sig    : HMAC-SHA256 atas `<orderCode>.<random>` dengan QR_SIGNING_SECRET
 *
 * Token ini yang dicetak jadi QR. Penandatanganan membuat QR tidak bisa dipalsukan
 * meski orang tahu formatnya, dan verifikasi tetap dilakukan ke database (order harus ada).
 */

const PREFIX = "TKT";

function secret(): string {
  const value = process.env.QR_SIGNING_SECRET;
  if (!value || value.length < 16) {
    throw new Error("QR_SIGNING_SECRET belum diisi (minimal 16 karakter)");
  }
  return value;
}

function sign(orderCode: string, random: string): string {
  return createHmac("sha256", secret()).update(`${orderCode}.${random}`).digest("base64url").slice(0, 32);
}

export function issueQrToken(orderCode: string): { token: string; random: string } {
  // orderCode bisa mengandung titik? tidak — formatnya ATR-2026-0001. Jaga tetap aman.
  const safeCode = orderCode.replace(/[^A-Za-z0-9-]/g, "");
  const random = randomBytes(16).toString("base64url");
  const token = `${PREFIX}.${safeCode}.${random}.${sign(safeCode, random)}`;
  return { token, random };
}

export type ParsedToken = { ok: true; orderCode: string } | { ok: false; reason: string };

export function parseQrToken(token: string): ParsedToken {
  const parts = token.split(".");
  if (parts.length !== 4) return { ok: false, reason: "FORMAT" };
  const [prefix, orderCode, random, sig] = parts;
  if (prefix !== PREFIX) return { ok: false, reason: "PREFIX" };
  if (!orderCode || !random || !sig) return { ok: false, reason: "FORMAT" };

  const expected = sign(orderCode, random);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "SIGNATURE" };

  return { ok: true, orderCode };
}

/** Token lama (hash dummy) tetap diterima supaya data seed bisa dipindai. */
export const looksLikeLegacyToken = (token: string) => !token.startsWith(`${PREFIX}.`);
