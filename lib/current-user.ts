import { cookies } from "next/headers";
import { SESSION } from "@/lib/constants";
import { getSessionFromToken, type SessionUser } from "@/lib/session";

/**
 * For the frontend team: use this in Server Components, layouts and Server
 * Actions to find out who is logged in without an HTTP round-trip.
 *
 *   const user = await getCurrentUser();
 *   if (!user) redirect("/login");
 *   if (user.role !== "ADMIN") redirect("/");   // admin pages
 *
 * API routes use requireUser / requireAdmin from lib/auth.ts instead.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = await getSessionFromToken(cookieStore.get(SESSION.cookieName)?.value);
  return session?.user ?? null;
}
