// Uji token QR: format, tanda tangan, dan penolakan token palsu.
import { test, expect } from "vitest";
import { issueQrToken, parseQrToken, looksLikeLegacyToken } from "../lib/qr/token";

/* Vitest tidak memuat .env otomatis untuk test biasa; set manual. */
process.env.QR_SIGNING_SECRET = "test-secret-minimal-16-chars";

test("token yang diterbitkan punya format TKT.<order>.<random>.<sig>", () => {
  const { token } = issueQrToken("ATR-2026-0001");
  const parts = token.split(".");
  expect(parts).toHaveLength(4);
  expect(parts[0]).toBe("TKT");
  expect(parts[1]).toBe("ATR-2026-0001");
  expect(parts[2].length).toBeGreaterThanOrEqual(20);
});

test("token berbeda setiap kali diterbitkan untuk order yang sama", () => {
  const a = issueQrToken("ATR-2026-0001").token;
  const b = issueQrToken("ATR-2026-0001").token;
  expect(a).not.toBe(b);
});

test("token yang diterbitkan lolos verifikasi tanda tangan", () => {
  const { token } = issueQrToken("QRPROD-0001");
  const parsed = parseQrToken(token);
  expect(parsed.ok).toBe(true);
  if (parsed.ok) expect(parsed.orderCode).toBe("QRPROD-0001");
});

test("random yang diubah membuat tanda tangan tidak cocok", () => {
  const { token } = issueQrToken("ATR-2026-0001");
  const parts = token.split(".");
  parts[2] = parts[2].slice(0, -3) + "AAA";
  const parsed = parseQrToken(parts.join("."));
  expect(parsed.ok).toBe(false);
  if (!parsed.ok) expect(parsed.reason).toBe("SIGNATURE");
});

test("order code yang ditukar membuat token tidak sah", () => {
  const { token } = issueQrToken("ATR-2026-0001");
  const parts = token.split(".");
  parts[1] = "ATR-2026-9999";
  const parsed = parseQrToken(parts.join("."));
  expect(parsed.ok).toBe(false);
});

test("format asing ditolak, token lama tetap dikenali sebagai legacy", () => {
  expect(parseQrToken("ngawur").ok).toBe(false);
  expect(parseQrToken("TKT.abc").ok).toBe(false);
  expect(looksLikeLegacyToken("DUMMY_HASH_QR_ATR_001")).toBe(true);
  expect(looksLikeLegacyToken(issueQrToken("X-1").token)).toBe(false);
});
