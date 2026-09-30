import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/health - liveness + database check, for uptime monitoring (99% target). */
export const GET = route(async () => {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ status: "ok", database: "up", latencyMs: Date.now() - started });
  } catch {
    return json({ status: "degraded", database: "down" }, 503);
  }
});
