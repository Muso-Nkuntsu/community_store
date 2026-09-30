import { NextRequest } from "next/server";
import type { Category, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { SESSION } from "@/lib/constants";

export const TEST_PASSWORD = "Password123!";
const BASE_URL = "http://localhost:3000";

/** Empties every table (children first). */
export async function resetDb() {
  await prisma.session.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.report.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.updateMany({ data: { deactivatedById: null } });
  await prisma.user.deleteMany();
}

let counter = 0;
export async function createUser(opts: { role?: Role; isActive?: boolean; name?: string; email?: string } = {}) {
  counter += 1;
  return prisma.user.create({
    data: {
      name: opts.name ?? `Test User ${counter}`,
      email: opts.email ?? `user${counter}-${Date.now()}@example.test`,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: opts.role ?? "USER",
      isActive: opts.isActive ?? true,
    },
  });
}

export async function createListing(
  sellerId: string,
  data: Partial<{ title: string; description: string; price: string; category: Category; status: "ACTIVE" | "SOLD" | "REMOVED"; createdAt: Date }> = {},
) {
  return prisma.listing.create({
    data: {
      title: data.title ?? "Test listing",
      description: data.description ?? "A perfectly ordinary test listing.",
      price: data.price ?? "100.00",
      category: data.category ?? "OTHER",
      status: data.status ?? "ACTIVE",
      createdAt: data.createdAt,
      sellerId,
    },
  });
}

type Handler<P> = (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>;

/** Calls a route handler directly, the way Next.js would. */
export async function call<P extends Record<string, string> = Record<string, never>>(
  handler: Handler<P>,
  opts: {
    method?: string;
    path?: string;
    body?: unknown;
    cookie?: string;
    params?: P;
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.cookie) headers["cookie"] = opts.cookie;

  const req = new NextRequest(new URL(opts.path ?? "/api/test", BASE_URL), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const res = await handler(req, { params: Promise.resolve((opts.params ?? {}) as P) });
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test convenience
  const body: any = text ? JSON.parse(text) : null;
  return { status: res.status, body, res };
}

/** Pulls "cs_session=..." out of a response, ready to send back as a Cookie header. */
export function sessionCookieFrom(res: Response): string | undefined {
  const cookies = res.headers.getSetCookie();
  const match = cookies.find((c) => c.startsWith(`${SESSION.cookieName}=`));
  const pair = match?.split(";")[0];
  return pair && pair !== `${SESSION.cookieName}=` ? pair : undefined;
}

/** Logs in through the real login route and returns the session cookie. */
export async function loginAs(email: string, password = TEST_PASSWORD): Promise<string> {
  const { POST } = await import("@/app/api/auth/login/route");
  const { status, res, body } = await call(POST, { method: "POST", path: "/api/auth/login", body: { email, password } });
  if (status !== 200) throw new Error(`login failed (${status}): ${JSON.stringify(body)}`);
  const cookie = sessionCookieFrom(res);
  if (!cookie) throw new Error("login did not set a session cookie");
  return cookie;
}
