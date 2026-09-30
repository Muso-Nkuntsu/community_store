import { json, route, searchParamsObject } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminListingsQuerySchema } from "@/lib/validations";
import { listAllListings } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

/** GET /api/admin/listings?q=&status=ACTIVE|SOLD|REMOVED&includeDeleted=true&page=&limit= - ADMIN only. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const query = adminListingsQuerySchema.parse(searchParamsObject(req));
  return json(await listAllListings(query));
});
