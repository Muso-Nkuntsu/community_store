import { json, route, searchParamsObject } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminReportsQuerySchema } from "@/lib/validations";
import { listReports } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

/** GET /api/admin/reports?status=PENDING|REVIEWED|DISMISSED|ACTION_TAKEN|OPEN&page=&limit= - ADMIN only. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const query = adminReportsQuerySchema.parse(searchParamsObject(req));
  return json(await listReports(query));
});
