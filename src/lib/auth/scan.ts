import { NextResponse } from "next/server";
import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Autentikasi ringan untuk perangkat petugas.
 * Admin (cookie) boleh; perangkat lapangan memakai kode akses bersama (SCAN_ACCESS_CODE).
 * Header: x-scan-code: <kode>
 */
export function scanAuthorized(request: Request): boolean {
  const expected = process.env.SCAN_ACCESS_CODE;
  if (!expected) return false;

  const given = request.headers.get("x-scan-code") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Kode sesi sekali pakai untuk membuka pemindai di perangkat baru. */
export function deviceToken() {
  return randomBytes(24).toString("base64url");
}

export function unauthorized() {
  return NextResponse.json(
    { error: { code: "SCAN_UNAUTHORIZED", message: "Kode akses petugas tidak valid" } },
    { status: 401 },
  );
}
