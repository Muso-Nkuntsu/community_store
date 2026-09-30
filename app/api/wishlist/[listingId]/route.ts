import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { idSchema } from "@/lib/validations";
import { removeFromWishlist } from "@/lib/services/wishlist-service";

/** DELETE /api/wishlist/:listingId - remove a saved listing. */
export const DELETE = route<{ listingId: string }>(async (req, { params }) => {
  const user = await requireUser(req);
  const listingId = idSchema.parse((await params).listingId);
  await removeFromWishlist(user.id, listingId);
  return json({ message: "Removed from your wishlist." });
});
