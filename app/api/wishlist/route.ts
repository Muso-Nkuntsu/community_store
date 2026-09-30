import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { addWishlistSchema } from "@/lib/validations";
import { addToWishlist, getWishlist } from "@/lib/services/wishlist-service";

export const dynamic = "force-dynamic";

/** GET /api/wishlist - saved listings; unavailable ones are flagged, not dropped. */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json(await getWishlist(user.id));
});

/** POST /api/wishlist - Body: { listingId }. 201, or 409 if already saved. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const { listingId } = addWishlistSchema.parse(await readJson(req));
  const item = await addToWishlist(user.id, listingId);
  return json({ item, message: "Added to your wishlist." }, 201);
});
