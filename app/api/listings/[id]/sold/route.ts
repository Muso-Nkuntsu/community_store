import { json, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { idSchema } from "@/lib/validations";
import { markListingSold } from "@/lib/services/listing-service";

/** POST /api/listings/:id/sold - owner marks an ACTIVE listing as SOLD. It stays visible with a SOLD badge. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = idSchema.parse((await params).id);
  const listing = await markListingSold(id, user);
  return json({ listing, message: "Marked as sold. It stays in your listing history." });
});
