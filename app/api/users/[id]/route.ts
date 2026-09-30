import { json, route } from "@/lib/api";
import { idSchema } from "@/lib/validations";
import { getSellerProfile } from "@/lib/services/user-service";

export const dynamic = "force-dynamic";

/** GET /api/users/:id - public seller profile (name, joined date, contact, active listings). No login needed. */
export const GET = route<{ id: string }>(async (_req, { params }) => {
  const id = idSchema.parse((await params).id);
  return json(await getSellerProfile(id));
});
