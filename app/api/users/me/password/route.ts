import { json, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getSessionFromToken, getSessionTokenFromRequest } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations";
import { changePassword } from "@/lib/services/user-service";

/** POST /api/users/me/password - Body: { currentPassword, newPassword, confirmPassword }. Logs out other devices. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  const input = changePasswordSchema.parse(await readJson(req));
  const session = await getSessionFromToken(getSessionTokenFromRequest(req));
  await changePassword(user.id, session?.sessionId ?? null, input);
  return json({ message: "Password changed." });
});
