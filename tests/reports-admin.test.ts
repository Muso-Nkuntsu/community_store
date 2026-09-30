import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as reportListing } from "@/app/api/listings/[id]/reports/route";
import { GET as myReports } from "@/app/api/reports/route";
import { GET as adminStats } from "@/app/api/admin/stats/route";
import { GET as adminUsers } from "@/app/api/admin/users/route";
import { PATCH as adminUpdateUser } from "@/app/api/admin/users/[id]/route";
import { GET as adminListings } from "@/app/api/admin/listings/route";
import { DELETE as adminRemoveListing } from "@/app/api/admin/listings/[id]/route";
import { GET as adminReports } from "@/app/api/admin/reports/route";
import { PATCH as adminUpdateReport } from "@/app/api/admin/reports/[id]/route";
import { GET as listingDetail } from "@/app/api/listings/[id]/route";
import { GET as getMe } from "@/app/api/users/me/route";
import { call, createListing, createUser, loginAs, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function setup() {
  const admin = await createUser({ role: "ADMIN" });
  const seller = await createUser();
  const reporter = await createUser();
  const listing = await createListing(seller.id, { title: "Suspicious phone" });
  return {
    admin,
    seller,
    reporter,
    listing,
    adminCookie: await loginAs(admin.email),
    sellerCookie: await loginAs(seller.email),
    reporterCookie: await loginAs(reporter.email),
  };
}

describe("reporting listings", () => {
  it("lets a logged-in user report a listing", async () => {
    const { listing, reporter, reporterCookie } = await setup();
    const { status, body } = await call(reportListing, {
      method: "POST",
      cookie: reporterCookie,
      params: { id: listing.id },
      body: { reason: "FRAUD", details: "Asked for payment upfront." },
    });
    expect(status).toBe(201);
    expect(body.message).toBe("Your report has been received.");

    const stored = await prisma.report.findFirstOrThrow({ where: { listingId: listing.id } });
    expect(stored).toMatchObject({ reporterId: reporter.id, reason: "FRAUD", status: "PENDING" });

    const mine = await call(myReports, { cookie: reporterCookie });
    expect(mine.body.items).toHaveLength(1);
  });

  it("requires login and a reason", async () => {
    const { listing, reporterCookie } = await setup();
    expect((await call(reportListing, { method: "POST", params: { id: listing.id }, body: { reason: "SPAM" } })).status).toBe(401);
    const noReason = await call(reportListing, { method: "POST", cookie: reporterCookie, params: { id: listing.id }, body: {} });
    expect(noReason.status).toBe(400);
    expect(noReason.body.error.fields.reason).toBeDefined();
  });

  it("requires details when the reason is OTHER", async () => {
    const { listing, reporterCookie } = await setup();
    const { status, body } = await call(reportListing, {
      method: "POST",
      cookie: reporterCookie,
      params: { id: listing.id },
      body: { reason: "OTHER" },
    });
    expect(status).toBe(400);
    expect(body.error.fields.details).toBeDefined();
  });

  it("blocks duplicate open reports from the same user", async () => {
    const { listing, reporterCookie } = await setup();
    const send = () =>
      call(reportListing, { method: "POST", cookie: reporterCookie, params: { id: listing.id }, body: { reason: "SPAM" } });
    expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(409);
  });

  it("does not let sellers report their own listing", async () => {
    const { listing, sellerCookie } = await setup();
    const { status } = await call(reportListing, {
      method: "POST",
      cookie: sellerCookie,
      params: { id: listing.id },
      body: { reason: "SPAM" },
    });
    expect(status).toBe(400);
  });
});

describe("admin access control", () => {
  it("normal users get 403 and anonymous users 401 on every admin route", async () => {
    const { sellerCookie } = await setup();
    for (const handler of [adminStats, adminUsers, adminListings, adminReports]) {
      expect((await call(handler, { cookie: sellerCookie })).status).toBe(403);
      expect((await call(handler)).status).toBe(401);
    }
  });

  it("admins can access the dashboard and management lists", async () => {
    const { adminCookie } = await setup();
    const stats = await call(adminStats, { cookie: adminCookie });
    expect(stats.status).toBe(200);
    expect(stats.body.stats).toMatchObject({ users: 3, activeUsers: 3, listings: 1, activeListings: 1, pendingReports: 0 });

    expect((await call(adminUsers, { cookie: adminCookie, path: "/api/admin/users" })).body.total).toBe(3);
    expect((await call(adminListings, { cookie: adminCookie, path: "/api/admin/listings" })).body.total).toBe(1);
  });
});

describe("admin listing removal", () => {
  it("requires a reason", async () => {
    const { listing, adminCookie } = await setup();
    const { status, body } = await call(adminRemoveListing, {
      method: "DELETE",
      cookie: adminCookie,
      params: { id: listing.id },
      body: {},
    });
    expect(status).toBe(400);
    expect(body.error.fields.reason).toBeDefined();
  });

  it("removes the listing and stores who, why and when", async () => {
    const { admin, listing, adminCookie } = await setup();
    const { status } = await call(adminRemoveListing, {
      method: "DELETE",
      cookie: adminCookie,
      params: { id: listing.id },
      body: { reason: "Scam - asks for payment upfront." },
    });
    expect(status).toBe(200);

    const stored = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(stored.status).toBe("REMOVED");
    expect(stored.removedById).toBe(admin.id);
    expect(stored.removalReason).toBe("Scam - asks for payment upfront.");
    expect(stored.removedAt).toBeInstanceOf(Date);

    // Gone for the public
    expect((await call(listingDetail, { params: { id: listing.id } })).status).toBe(404);
  });

  it("the seller still sees their removed listing with the reason", async () => {
    const { listing, adminCookie, sellerCookie } = await setup();
    await call(adminRemoveListing, {
      method: "DELETE",
      cookie: adminCookie,
      params: { id: listing.id },
      body: { reason: "Breaks community rules." },
    });
    const { status, body } = await call(listingDetail, { cookie: sellerCookie, params: { id: listing.id } });
    expect(status).toBe(200);
    expect(body.listing.moderation.removalReason).toBe("Breaks community rules.");
  });
});

describe("admin report handling", () => {
  it("report appears for admin and can be resolved with listing removal", async () => {
    const { admin, listing, adminCookie, reporterCookie } = await setup();
    await call(reportListing, {
      method: "POST",
      cookie: reporterCookie,
      params: { id: listing.id },
      body: { reason: "FRAUD" },
    });

    const queue = await call(adminReports, { cookie: adminCookie, path: "/api/admin/reports?status=PENDING" });
    expect(queue.body.total).toBe(1);
    const reportId = queue.body.items[0].id;
    expect(queue.body.items[0].listing.id).toBe(listing.id);

    const { status, body } = await call(adminUpdateReport, {
      method: "PATCH",
      cookie: adminCookie,
      params: { id: reportId },
      body: { status: "ACTION_TAKEN", removeListing: true, removalReason: "Confirmed scam.", resolutionNote: "Removed." },
    });
    expect(status).toBe(200);
    expect(body.report.status).toBe("ACTION_TAKEN");
    expect(body.report.resolvedBy.id).toBe(admin.id);

    const stored = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(stored.status).toBe("REMOVED");
    expect(stored.removalReason).toBe("Confirmed scam.");
  });

  it("can dismiss a report, and a resolved report cannot be resolved again", async () => {
    const { listing, adminCookie, reporterCookie } = await setup();
    await call(reportListing, { method: "POST", cookie: reporterCookie, params: { id: listing.id }, body: { reason: "SPAM" } });
    const report = await prisma.report.findFirstOrThrow();

    const dismiss = await call(adminUpdateReport, {
      method: "PATCH",
      cookie: adminCookie,
      params: { id: report.id },
      body: { status: "DISMISSED", resolutionNote: "Not spam." },
    });
    expect(dismiss.status).toBe(200);
    expect(dismiss.body.report.resolvedAt).not.toBeNull();

    const again = await call(adminUpdateReport, {
      method: "PATCH",
      cookie: adminCookie,
      params: { id: report.id },
      body: { status: "ACTION_TAKEN" },
    });
    expect(again.status).toBe(409);
  });

  it("removeListing requires ACTION_TAKEN and a reason", async () => {
    const { listing, adminCookie, reporterCookie } = await setup();
    await call(reportListing, { method: "POST", cookie: reporterCookie, params: { id: listing.id }, body: { reason: "SPAM" } });
    const report = await prisma.report.findFirstOrThrow();
    const { status } = await call(adminUpdateReport, {
      method: "PATCH",
      cookie: adminCookie,
      params: { id: report.id },
      body: { status: "DISMISSED", removeListing: true },
    });
    expect(status).toBe(400);
  });
});

describe("admin user management", () => {
  it("deactivates a user, logs them out and records who did it", async () => {
    const { admin, seller, adminCookie, sellerCookie } = await setup();
    const { status, body } = await call(adminUpdateUser, {
      method: "PATCH",
      cookie: adminCookie,
      params: { id: seller.id },
      body: { isActive: false, reason: "Spam" },
    });
    expect(status).toBe(200);
    expect(body.user.isActive).toBe(false);
    expect(body.user.deactivatedBy.id).toBe(admin.id);

    expect((await call(getMe, { cookie: sellerCookie })).status).toBe(401);
  });

  it("an admin cannot deactivate themselves", async () => {
    const { admin, adminCookie } = await setup();
    const { status } = await call(adminUpdateUser, {
      method: "PATCH",
      cookie: adminCookie,
      params: { id: admin.id },
      body: { isActive: false },
    });
    expect(status).toBe(400);
  });

  it("can reactivate a user", async () => {
    const { seller, adminCookie } = await setup();
    await call(adminUpdateUser, { method: "PATCH", cookie: adminCookie, params: { id: seller.id }, body: { isActive: false } });
    const { status, body } = await call(adminUpdateUser, {
      method: "PATCH",
      cookie: adminCookie,
      params: { id: seller.id },
      body: { isActive: true },
    });
    expect(status).toBe(200);
    expect(body.user.isActive).toBe(true);
  });
});
