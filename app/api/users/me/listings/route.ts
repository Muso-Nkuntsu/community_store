import { json, route, searchParamsObject } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { myListingsQuerySchema } from "@/lib/validations";
import { listMyListings } from "@/lib/services/listing-service";

export const dynamic = "force-dynamic";

/** GET /api/users/me/listings?status=ACTIVE|SOLD|REMOVED&page=&limit= - "My Listings" page, incl. sold history. */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  const query = myListingsQuerySchema.parse(searchParamsObject(req));
  return json(await listMyListings(user.id, query));
});
