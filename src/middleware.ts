import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS untuk endpoint /api/*.
 *
 * Customer side berjalan di origin berbeda (lokal :3100, produksi subdomain lain),
 * jadi browser memblokir panggilan lintas domain tanpa header CORS. Header di sini
 * hanya memantulkan Origin yang diizinkan, tidak wildcard, supaya cookie sesi tetap aman.
 */

const ALLOWED = new Set([
  "http://localhost:3100",
  "http://127.0.0.1:3100",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://summarecon-customer.axtra.tech",
  "https://summarecon-scan.axtra.tech",
  "https://summarecon-admin.axtra.tech",
]);

function withCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (origin && ALLOWED.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export function middleware(request: NextRequest) {
  /* Preflight: jawab langsung, jangan diteruskan ke route. */
  if (request.method === "OPTIONS" && request.headers.get("access-control-request-method")) {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.headers.set(
      "Access-Control-Allow-Headers",
      request.headers.get("access-control-request-headers") ?? "Content-Type, x-scan-code, Authorization",
    );
    res.headers.set("Access-Control-Max-Age", "86400");
    return withCors(request, res);
  }

  return withCors(request, NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};
