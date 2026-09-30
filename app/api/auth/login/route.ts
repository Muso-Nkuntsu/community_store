import { json, readJson, route } from "@/lib/api";
import { createSession, destroySessionByToken, getSessionTokenFromRequest, requestMeta, setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validations";
import { authenticate } from "@/lib/services/user-service";

/**
 * POST /api/auth/login
 * Body: { email, password }
 * 200 -> { user } + HttpOnly session cookie
 * 401 wrong credentials, 403 deactivated account
 */
export const POST = route(async (req) => {
  const input = loginSchema.parse(await readJson(req));
  const user = await authenticate(input);

  // Replace any existing session from this browser (prevents session fixation).
  await destroySessionByToken(getSessionTokenFromRequest(req));
  const { token } = await createSession(user.id, requestMeta(req));

  const res = json({ user });
  setSessionCookie(res, token);
  return res;
});
