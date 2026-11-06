import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Role } from "@/types/admin";

export const ADMIN_COOKIE = "summa_admin_session";
export const CUSTOMER_COOKIE = "summa_customer_session";

const ADMIN_TTL_HOURS = 12;
const CUSTOMER_TTL_HOURS = 24 * 7;

export type SessionUser = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  roleName: string;
  roleId: string;
  audience: "ADMIN" | "CUSTOMER";
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function roleAudience(roleId: string): "ADMIN" | "CUSTOMER" {
  return roleId === "ROLE-CUSTOMER" ? "CUSTOMER" : "ADMIN";
}

/** Buat sesi baru; token asli hanya dikirim sekali lewat cookie, DB menyimpan hash-nya. */
export async function createSession(
  userId: string,
  opts: { audience: "ADMIN" | "CUSTOMER"; ip?: string | null; userAgent?: string | null },
) {
  const token = randomBytes(32).toString("base64url");
  const ttl = opts.audience === "ADMIN" ? ADMIN_TTL_HOURS : CUSTOMER_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttl * 3600 * 1000);

  const session = await prisma.session.create({
    data: {
      id: `SES-${randomBytes(8).toString("hex").toUpperCase()}`,
      userId,
      tokenHash: sha256(token),
      audience: opts.audience,
      createdAt: new Date(),
      expiresAt,
      ipAddress: opts.ip ?? null,
      userAgent: opts.userAgent?.slice(0, 200) ?? null,
    },
  });

  return { token, sessionId: session.id, expiresAt };
}

export function sessionCookie(audience: "ADMIN" | "CUSTOMER", token: string, expiresAt: Date) {
  return {
    name: audience === "ADMIN" ? ADMIN_COOKIE : CUSTOMER_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export function clearedCookie(audience: "ADMIN" | "CUSTOMER") {
  return {
    name: audience === "ADMIN" ? ADMIN_COOKIE : CUSTOMER_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

/** Baca sesi dari cookie, atau dari header Authorization: Bearer (untuk API customer). */
export async function getSession(request?: Request): Promise<SessionUser | null> {
  let token: string | undefined;

  const bearer = request?.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) token = bearer.slice(7).trim();

  if (!token) {
    const jar = await cookies();
    token = jar.get(ADMIN_COOKIE)?.value ?? jar.get(CUSTOMER_COOKIE)?.value;
  }
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: true } } },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) return null;
  if (session.user.accountStatus !== "ACTIVE") return null;

  return {
    sessionId: session.id,
    userId: session.userId,
    name: session.user.fullName,
    email: session.user.email,
    roleId: session.user.roleId,
    roleName: session.user.role.roleName,
    audience: session.audience as "ADMIN" | "CUSTOMER",
  };
}

export async function revokeSession(sessionId: string) {
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

/** Admin = semua role internal; petugas check-in hanya boleh modul check-in. */
export const isAdminUser = (u: SessionUser | null): u is SessionUser =>
  Boolean(u && u.audience === "ADMIN" && u.roleId !== "ROLE-CUSTOMER");

export const isCustomer = (u: SessionUser | null): u is SessionUser => Boolean(u && u.audience === "CUSTOMER");
