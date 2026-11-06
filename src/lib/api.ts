import { NextResponse } from "next/server";

/* Amplop respons seragam: { data } atau { error: { code, message, details } }. */
export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json({ data }, init);

export const created = <T>(data: T, location?: string) =>
  NextResponse.json({ data }, { status: 201, headers: location ? { Location: location } : undefined });

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export const notFound = (what: string) => fail(404, "NOT_FOUND", `${what} tidak ditemukan`);
export const badRequest = (message: string, details?: unknown) => fail(400, "VALIDATION_ERROR", message, details);
export const conflict = (message: string, details?: unknown) => fail(409, "CONFLICT", message, details);

/** Paging sederhana: ?page=1&perPage=25 (maks 100). */
export function paging(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? 25) || 25));
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function pageMeta(total: number, page: number, perPage: number) {
  return { total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

/** JSON tersimpan di kolom teks; balikkan ke objek saat dibaca API. */
export function parseJsonSafe<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
