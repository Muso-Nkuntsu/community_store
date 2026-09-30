import { json, readJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminRemoveListingSchema, idSchema } from "@/lib/validations";
import { getListingForAdmin, removeListing } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/admin/listings/:id - any listing (incl. removed/deleted) with all its reports. */
export const GET = route<Params>(async (req, { params }) => {
  await requireAdmin(req);
  const id = idSchema.parse((await params).id);
  return json(await getListingForAdmin(id));
});

/**
 * DELETE /api/admin/listings/:id - Body: { reason } (required, 5-500 chars).
 * Marks the listing REMOVED and records admin + reason + time. Nothing is erased.
 */
export const DELETE = route<Params>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = idSchema.parse((await params).id);
  const { reason } = adminRemoveListingSchema.parse(await readJson(req));
  const result = await removeListing(admin.id, id, reason);
  return json({ ...result, message: "Listing removed." });
});
