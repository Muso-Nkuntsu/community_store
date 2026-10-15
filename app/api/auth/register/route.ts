import { json, readJson, route } from "@/lib/api";
import { createSession, destroySessionByToken, getSessionTokenFromRequest, requestMeta, setSessionCookie } from "@/lib/session";
import { registerSchema } from "@/lib/validations";
import { registerUser } from "@/lib/services/user-service";

/**
 * POST /api/auth/register
 * Body: { name, email, studentId?, phone?, password, confirmPassword }
 * 201 -> { user } and the user is logged in (session cookie set).
 */
export const POST = route(async (req) => {
  const input = registerSchema.parse(await readJson(req));
  const user = await registerUser(input);

  // Same as login: replace any session this browser already had (prevents session fixation).
  await destroySessionByToken(getSessionTokenFromRequest(req));
  const { token } = await createSession(user.id, requestMeta(req));
  const res = json({ user, message: "Account created." }, 201);
  setSessionCookie(res, token);
  return res;
});
