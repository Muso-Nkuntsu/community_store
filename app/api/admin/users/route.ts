import { json, route, searchParamsObject } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminUsersQuerySchema } from "@/lib/validations";
import { listUsers } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

/** GET /api/admin/users?q=&status=active|inactive&role=USER|ADMIN&page=&limit= - ADMIN only. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const query = adminUsersQuerySchema.parse(searchParamsObject(req));
  return json(await listUsers(query));
});
