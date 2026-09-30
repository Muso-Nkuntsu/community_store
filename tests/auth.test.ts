import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { SESSION } from "@/lib/constants";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as getSession } from "@/app/api/auth/session/route";
import { GET as getMe } from "@/app/api/users/me/route";
import { call, createUser, loginAs, resetDb, sessionCookieFrom, TEST_PASSWORD } from "./helpers";

const validRegistration = {
  name: "Nomsa Dlamini",
  email: "Nomsa@Example.test",
  studentId: "3811111",
  password: "SuperSecret1",
  confirmPassword: "SuperSecret1",
};

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("registration", () => {
  it("creates a user, hashes the password and logs them in", async () => {
    const { status, body, res } = await call(register, { method: "POST", body: validRegistration });

    expect(status).toBe(201);
    expect(body.user.email).toBe("nomsa@example.test"); // normalised
    expect(body.user).not.toHaveProperty("passwordHash");

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "nomsa@example.test" } });
    expect(stored.passwordHash).not.toBe(validRegistration.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt

    const cookie = res.headers.getSetCookie().find((c) => c.startsWith(SESSION.cookieName));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
  });

  it("rejects a duplicate email with 409", async () => {
    await call(register, { method: "POST", body: validRegistration });
    const { status, body } = await call(register, {
      method: "POST",
      body: { ...validRegistration, studentId: null, email: "NOMSA@example.test" },
    });
    expect(status).toBe(409);
    expect(body.error.fields.email).toBeDefined();
  });

  it("rejects a duplicate student ID with 409", async () => {
    await call(register, { method: "POST", body: validRegistration });
    const { status, body } = await call(register, {
      method: "POST",
      body: { ...validRegistration, email: "other@example.test" },
    });
    expect(status).toBe(409);
    expect(body.error.fields.studentId).toBeDefined();
  });

  it("allows registration without a student ID", async () => {
    const { status } = await call(register, {
      method: "POST",
      body: { ...validRegistration, studentId: undefined },
    });
    expect(status).toBe(201);
  });

  it("validates fields and returns 400 with field errors", async () => {
    const { status, body } = await call(register, {
      method: "POST",
      body: { name: "", email: "not-an-email", password: "short", confirmPassword: "different" },
    });
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("rejects mismatched password confirmation", async () => {
    const { status, body } = await call(register, {
      method: "POST",
      body: { ...validRegistration, confirmPassword: "SomethingElse1" },
    });
    expect(status).toBe(400);
    expect(body.error.fields.confirmPassword).toBeDefined();
  });
});

describe("login and logout", () => {
  it("logs in with correct credentials and sets a session cookie", async () => {
    const user = await createUser();
    const { status, body, res } = await call(login, {
      method: "POST",
      body: { email: user.email, password: TEST_PASSWORD },
    });
    expect(status).toBe(200);
    expect(body.user.id).toBe(user.id);
    expect(sessionCookieFrom(res)).toBeDefined();
  });

  it("rejects a wrong password with 401 and a generic message", async () => {
    const user = await createUser();
    const { status, body } = await call(login, { method: "POST", body: { email: user.email, password: "wrong-password" } });
    expect(status).toBe(401);
    expect(body.error.message).toBe("Invalid email or password.");
  });

  it("rejects an unknown email with the same 401", async () => {
    const { status, body } = await call(login, {
      method: "POST",
      body: { email: "nobody@example.test", password: TEST_PASSWORD },
    });
    expect(status).toBe(401);
    expect(body.error.message).toBe("Invalid email or password.");
  });

  it("rejects a deactivated user with 403", async () => {
    const user = await createUser({ isActive: false });
    const { status } = await call(login, { method: "POST", body: { email: user.email, password: TEST_PASSWORD } });
    expect(status).toBe(403);
  });

  it("logout destroys the session server-side", async () => {
    const user = await createUser();
    const cookie = await loginAs(user.email);
    expect((await call(getMe, { cookie })).status).toBe(200);

    const out = await call(logout, { method: "POST", cookie });
    expect(out.status).toBe(200);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);

    expect((await call(getMe, { cookie })).status).toBe(401);
  });
});

describe("sessions", () => {
  it("reports the current session", async () => {
    const user = await createUser();
    const cookie = await loginAs(user.email);
    const { body } = await call(getSession, { cookie });
    expect(body.authenticated).toBe(true);
    expect(body.user.id).toBe(user.id);
  });

  it("returns authenticated=false without a cookie", async () => {
    const { status, body } = await call(getSession);
    expect(status).toBe(200);
    expect(body.authenticated).toBe(false);
  });

  it("expires after 30 minutes of inactivity", async () => {
    const user = await createUser();
    const cookie = await loginAs(user.email);
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { lastActivityAt: new Date(Date.now() - SESSION.idleTimeoutMs - 1000) },
    });

    expect((await call(getMe, { cookie })).status).toBe(401);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("stays alive when used within 30 minutes", async () => {
    const user = await createUser();
    const cookie = await loginAs(user.email);
    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { lastActivityAt: new Date(Date.now() - 25 * 60 * 1000) },
    });
    expect((await call(getMe, { cookie })).status).toBe(200);
    // Activity was recorded, so the 30-minute window restarted.
    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(Date.now() - session.lastActivityAt.getTime()).toBeLessThan(60_000);
  });

  it("stores only a hash of the session token", async () => {
    const user = await createUser();
    const cookie = await loginAs(user.email);
    const token = cookie.split("=")[1]!;
    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.tokenHash).not.toBe(token);
    expect(session.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("protected routes reject requests with no session", async () => {
    expect((await call(getMe)).status).toBe(401);
  });

  it("blocks cross-site POSTs using the Origin header", async () => {
    const user = await createUser();
    const { status } = await call(login, {
      method: "POST",
      body: { email: user.email, password: TEST_PASSWORD },
      headers: { origin: "https://evil.example", host: "localhost:3000" },
    });
    expect(status).toBe(403);
  });
});
