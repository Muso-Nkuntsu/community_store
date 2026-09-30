import { json, route } from "@/lib/api";
import { clearSessionCookie, destroySessionByToken, getSessionTokenFromRequest } from "@/lib/session";

/** POST /api/auth/logout - deletes the session server-side and clears the cookie. Always 200. */
export const POST = route(async (req) => {
  await destroySessionByToken(getSessionTokenFromRequest(req));
  const res = json({ message: "Logged out." });
  clearSessionCookie(res);
  return res;
});
