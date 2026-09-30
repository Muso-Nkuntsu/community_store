import { json, readJson, route } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { adminUpdateUserSchema, idSchema } from "@/lib/validations";
import { setUserActive } from "@/lib/services/admin-service";

/**
 * PATCH /api/admin/users/:id - Body: { isActive: false, reason? } to deactivate,
 * { isActive: true } to reactivate. ADMIN only; cannot target yourself.
 */
export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = idSchema.parse((await params).id);
  const { isActive, reason } = adminUpdateUserSchema.parse(await readJson(req));
  const user = await setUserActive(admin.id, id, isActive, reason ?? null);
  return json({ user, message: isActive ? "User reactivated." : "User deactivated." });
});
