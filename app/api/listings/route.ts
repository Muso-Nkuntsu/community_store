import { json, readJson, route, searchParamsObject } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createListingSchema, listingQuerySchema } from "@/lib/validations";
import { createListing, searchListings } from "@/lib/services/listing-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/listings - public browse/search/filter, newest first, paginated.
 *   ?q=java                               search title + description
 *   ?categories=TEXTBOOKS,ELECTRONICS     one or more categories (or ?category=TEXTBOOKS)
 *   ?status=ACTIVE|SOLD                   default: both
 *   ?sellerId=<id>                        one seller's listings
 *   ?page=1&limit=12                      limit max 50
 */
export const GET = route(async (req) => {
  const query = listingQuerySchema.parse(searchParamsObject(req));
  return json(await searchListings(query));
});

/** POST /api/listings - Body: { title, description, price, category, imageUrl? }. 201 -> { listing } */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const input = createListingSchema.parse(await readJson(req));
  const listing = await createListing(user, input);
  return json({ listing, message: "Your listing is live." }, 201);
});
