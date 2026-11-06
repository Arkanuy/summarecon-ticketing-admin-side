import { PrismaClient } from "@prisma/client";

/* Satu instance di dev agar hot reload tidak membuka koneksi baru terus-menerus. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
