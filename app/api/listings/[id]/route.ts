import { json, readJson, route } from "@/lib/api";
import { getRequestUser, requireUser } from "@/lib/auth";
import { idSchema, updateListingSchema } from "@/lib/validations";
import { deleteListing, getListingDetail, updateListing } from "@/lib/services/listing-service";
import { isInWishlist } from "@/lib/services/wishlist-service";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/listings/:id - detail page. Public; response includes what the viewer may do. */
export const GET = route<Params>(async (req, { params }) => {
  const id = idSchema.parse((await params).id);
  const viewer = await getRequestUser(req);
  const listing = await getListingDetail(id, viewer);
  const inWishlist = viewer ? await isInWishlist(viewer.id, id) : false;
  return json({ listing: { ...listing, viewer: { ...listing.viewer, inWishlist } } });
});

/** PATCH /api/listings/:id - owner only. Body: any of { title, description, price, category, imageUrl }. */
export const PATCH = route<Params>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = idSchema.parse((await params).id);
  const input = updateListingSchema.parse(await readJson(req));
  return json({ listing: await updateListing(id, user, input), message: "Listing updated." });
});

/** DELETE /api/listings/:id - owner only. Admins use DELETE /api/admin/listings/:id (needs a reason). */
export const DELETE = route<Params>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = idSchema.parse((await params).id);
  await deleteListing(id, user);
  return json({ message: "Listing deleted." });
});
