import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { clearSessionCookie } from "@/lib/session";
import { deleteAccountSchema, updateProfileSchema } from "@/lib/validations";
import { deleteMyAccount, getMyProfile, updateMyProfile } from "@/lib/services/user-service";

export const dynamic = "force-dynamic";

/** GET /api/users/me - own profile + dashboard stats + 5 most recent listings. */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  return json(await getMyProfile(user.id));
});

/** PATCH /api/users/me - Body: any of { name, email, studentId, phone } (null clears studentId/phone). */
export const PATCH = route(async (req) => {
  const user = await requireUser(req);
  const input = updateProfileSchema.parse(await readJson(req));
  return json({ user: await updateMyProfile(user.id, input), message: "Profile updated." });
});

/** DELETE /api/users/me - Body: { password }. Anonymises the account and logs out. */
export const DELETE = route(async (req) => {
  const user = await requireUser(req);
  const { password } = deleteAccountSchema.parse(await readJson(req));
  await deleteMyAccount(user.id, password);
  const res = json({ message: "Your account has been deleted." });
  clearSessionCookie(res);
  return res;
});
