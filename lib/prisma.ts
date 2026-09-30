import { PrismaClient } from "@prisma/client";

// One PrismaClient for the whole app. In development Next.js hot-reloads
// modules, which would otherwise open a new connection pool on every change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
