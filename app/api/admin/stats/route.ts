import { json, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

/** GET /api/admin/stats - dashboard counts. ADMIN only. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  return json({ stats: await getDashboardStats() });
});
