import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { forbidden, unauthorized } from "@/lib/api";
import { getSessionFromToken, getSessionTokenFromRequest, type SessionUser } from "@/lib/session";

function bcryptRounds(): number {
  const fromEnv = Number(process.env.BCRYPT_ROUNDS);
  if (Number.isInteger(fromEnv) && fromEnv >= 4 && fromEnv <= 15) return fromEnv;
  return 12;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, bcryptRounds());
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// Compared against when an email doesn't exist, so a failed login takes the
// same time whether or not the account exists (no user enumeration by timing).
let dummyHash: string | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= await bcrypt.hash("dummy-password-for-timing", bcryptRounds());
  await bcrypt.compare(password, dummyHash);
}

/** The logged-in user for this request, or null. */
export async function getRequestUser(req: NextRequest): Promise<SessionUser | null> {
  const session = await getSessionFromToken(getSessionTokenFromRequest(req));
  return session?.user ?? null;
}

/** 401 unless logged in. */
export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await getRequestUser(req);
  if (!user) throw unauthorized();
  return user;
}

/** 401 unless logged in, 403 unless ADMIN. */
export async function requireAdmin(req: NextRequest): Promise<SessionUser> {
  const user = await requireUser(req);
  if (user.role !== "ADMIN") throw forbidden("Administrator access is required.");
  return user;
}
