import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION } from "@/lib/constants";

/**
 * Server-side sessions
 * --------------------
 * - Login creates a random 256-bit token. The browser gets the raw token in an
 *   HttpOnly cookie; the database stores only HMAC-SHA256(token, SESSION_SECRET).
 *   A leaked database dump therefore cannot be replayed as cookies.
 * - Every authenticated request checks lastActivityAt. More than 30 minutes of
 *   inactivity (requirement) or 12 hours total => session is deleted, 401.
 * - Nothing about the session is ever placed in localStorage.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type ActiveSession = {
  sessionId: string;
  user: SessionUser;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. Set it in your .env file (see .env.example).",
    );
  }
  return secret;
}

export function hashSessionToken(token: string): string {
  return crypto.createHmac("sha256", getSecret()).update(token).digest("hex");
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + SESSION.absoluteLifetimeMs);

  await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      lastActivityAt: new Date(now),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ipAddress: meta.ipAddress?.slice(0, 45) ?? null,
    },
  });

  // Opportunistic cleanup so the sessions table doesn't grow forever.
  await prisma.session
    .deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date(now) } },
          { lastActivityAt: { lt: new Date(now - SESSION.idleTimeoutMs) } },
        ],
      },
    })
    .catch(() => undefined);

  return { token, expiresAt };
}

/** Resolves a raw cookie token to a live session, enforcing the inactivity timeout. */
export async function getSessionFromToken(token: string | undefined | null): Promise<ActiveSession | null> {
  if (!token || token.length > 128) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true, deletedAt: true } },
    },
  });
  if (!session) return null;

  const now = Date.now();
  const idleExpired = now - session.lastActivityAt.getTime() > SESSION.idleTimeoutMs;
  const hardExpired = session.expiresAt.getTime() <= now;
  const userBlocked = !session.user.isActive || session.user.deletedAt !== null;

  if (idleExpired || hardExpired || userBlocked) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // Sliding window: record activity (throttled to one write per minute).
  if (now - session.lastActivityAt.getTime() > SESSION.touchIntervalMs) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastActivityAt: new Date(now) } })
      .catch(() => undefined);
  }

  const { id, name, email, role } = session.user;
  return { sessionId: session.id, user: { id, name, email, role } };
}

export function getSessionTokenFromRequest(req: NextRequest): string | undefined {
  return req.cookies.get(SESSION.cookieName)?.value;
}

export async function destroySessionByToken(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

const cookieBase = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

/**
 * Sets the session cookie. No maxAge: it is a browser-session cookie, and the
 * server decides expiry (30 min idle / 12 h absolute).
 */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION.cookieName, token, cookieBase());
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION.cookieName, "", { ...cookieBase(), maxAge: 0 });
}

export function requestMeta(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  return {
    userAgent: req.headers.get("user-agent"),
    ipAddress: forwarded ? forwarded.split(",")[0]!.trim() : req.headers.get("x-real-ip"),
  };
}
