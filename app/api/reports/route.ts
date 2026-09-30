import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listMyReports } from "@/lib/services/report-service";

export const dynamic = "force-dynamic";

/** GET /api/reports - reports the current user has submitted, with their status. Admins: /api/admin/reports. */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json(await listMyReports(user.id));
});
