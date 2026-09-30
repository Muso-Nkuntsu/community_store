import { json, route } from "@/lib/api";
import { SESSION } from "@/lib/constants";
import { clearSessionCookie, getSessionFromToken, getSessionTokenFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 * 200 -> { authenticated: true, user } or { authenticated: false, user: null }
 * Never 401, so the navbar can call it freely. Calling it counts as activity.
 */
export const GET = route(async (req) => {
  const token = getSessionTokenFromRequest(req);
  const session = await getSessionFromToken(token);
  const res = json({
    authenticated: session !== null,
    user: session?.user ?? null,
    idleTimeoutMinutes: SESSION.idleTimeoutMs / 60_000,
  });
  if (token && !session) clearSessionCookie(res); // stale/expired cookie
  return res;
});
