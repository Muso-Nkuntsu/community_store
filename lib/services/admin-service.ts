import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict, notFound } from "@/lib/api";
import { destroyAllSessionsForUser } from "@/lib/session";
import { adminReportInclude, paginate, toAdminListing, toAdminReport, toAdminUser } from "@/lib/serializers";
import type { AdminUpdateReportInput } from "@/lib/validations";

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardStats() {
  const liveUser = { deletedAt: null };
  const liveListing = { deletedAt: null };

  const [users, activeUsers, listings, activeListings, soldListings, removedListings, pendingReports] =
    await prisma.$transaction([
      prisma.user.count({ where: liveUser }),
      prisma.user.count({ where: { ...liveUser, isActive: true } }),
      prisma.listing.count({ where: liveListing }),
      prisma.listing.count({ where: { ...liveListing, status: "ACTIVE" } }),
      prisma.listing.count({ where: { ...liveListing, status: "SOLD" } }),
      prisma.listing.count({ where: { ...liveListing, status: "REMOVED" } }),
      prisma.report.count({ where: { status: "PENDING" } }),
    ]);

  return { users, activeUsers, listings, activeListings, soldListings, removedListings, pendingReports };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  studentId: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deactivatedAt: true,
  deactivationReason: true,
  deactivatedBy: { select: { id: true, name: true } },
  _count: { select: { listings: true, reports: true } },
} satisfies Prisma.UserSelect;

export async function listUsers(query: {
  q?: string;
  status?: "active" | "inactive";
  role?: "USER" | "ADMIN";
  page: number;
  limit: number;
}) {
  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(query.status === "active" && { isActive: true }),
    ...(query.status === "inactive" && { isActive: false }),
    ...(query.role && { role: query.role }),
    ...(query.q && {
      OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }, { studentId: { contains: query.q } }],
    }),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: adminUserSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return paginate(rows.map(toAdminUser), total, query.page, query.limit);
}

/**
 * Deactivate or reactivate a user. Records who did it and why.
 * - An admin can never deactivate their own account here (no accidental lock-out).
 * - The last active admin cannot be deactivated.
 * - Deactivation logs the user out everywhere and hides their listings.
 */
export async function setUserActive(adminId: string, targetId: string, isActive: boolean, reason: string | null) {
  if (targetId === adminId && !isActive) {
    throw badRequest("You cannot deactivate your own account.");
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, isActive: true, deletedAt: true },
  });
  if (!target || target.deletedAt) throw notFound("User not found.");

  if (!isActive && target.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, deletedAt: null, id: { not: targetId } },
    });
    if (otherAdmins === 0) throw conflict("The last active administrator cannot be deactivated.");
  }

  if (target.isActive === isActive) {
    throw conflict(isActive ? "This user is already active." : "This user is already deactivated.");
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: isActive
      ? { isActive: true, deactivatedAt: null, deactivatedById: null, deactivationReason: null }
      : { isActive: false, deactivatedAt: new Date(), deactivatedById: adminId, deactivationReason: reason },
    select: adminUserSelect,
  });

  if (!isActive) await destroyAllSessionsForUser(targetId);
  return toAdminUser(updated);
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

const adminListingInclude = {
  seller: { select: { id: true, name: true, email: true, isActive: true } },
  removedBy: { select: { id: true, name: true } },
  _count: { select: { reports: true } },
} satisfies Prisma.ListingInclude;

export async function listAllListings(query: {
  q?: string;
  status?: "ACTIVE" | "SOLD" | "REMOVED";
  includeDeleted: boolean;
  page: number;
  limit: number;
}) {
  const where: Prisma.ListingWhereInput = {
    ...(!query.includeDeleted && { deletedAt: null }),
    ...(query.status && { status: query.status }),
    ...(query.q && {
      OR: [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
        { seller: { name: { contains: query.q } } },
        { seller: { email: { contains: query.q } } },
      ],
    }),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      include: adminListingInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return paginate(rows.map(toAdminListing), total, query.page, query.limit);
}

export async function getListingForAdmin(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: adminListingInclude });
  if (!listing) throw notFound("Listing not found.");
  const reports = await prisma.report.findMany({
    where: { listingId },
    include: adminReportInclude,
    orderBy: { createdAt: "desc" },
  });
  return { listing: toAdminListing(listing), reports: reports.map(toAdminReport) };
}

/**
 * Moderation removal. Nothing is deleted: the listing becomes REMOVED and the
 * admin, reason and time are recorded. Any open reports on the listing are
 * closed as ACTION_TAKEN by the same admin.
 */
export async function removeListing(adminId: string, listingId: string, reason: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true } });
  if (!listing) throw notFound("Listing not found.");
  if (listing.status === "REMOVED") throw conflict("This listing has already been removed.");

  const now = new Date();
  await prisma.$transaction([
    prisma.listing.update({
      where: { id: listingId },
      data: { status: "REMOVED", removedAt: now, removedById: adminId, removalReason: reason },
    }),
    prisma.report.updateMany({
      where: { listingId, status: { in: ["PENDING", "REVIEWED"] } },
      data: {
        status: "ACTION_TAKEN",
        resolvedAt: now,
        resolvedById: adminId,
        resolutionNote: `Listing removed: ${reason}`.slice(0, 1000),
      },
    }),
  ]);

  return getListingForAdmin(listingId);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function listReports(query: {
  status?: "PENDING" | "REVIEWED" | "DISMISSED" | "ACTION_TAKEN" | "OPEN";
  page: number;
  limit: number;
}) {
  const where: Prisma.ReportWhereInput =
    query.status === "OPEN"
      ? { status: { in: ["PENDING", "REVIEWED"] } }
      : query.status
        ? { status: query.status }
        : {};

  const [total, rows] = await prisma.$transaction([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      include: adminReportInclude,
      // Oldest first for the moderation queue; newest first for history.
      orderBy: [
        { createdAt: query.status === "PENDING" || query.status === "OPEN" ? "asc" : "desc" },
        { id: "asc" },
      ],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return paginate(rows.map(toAdminReport), total, query.page, query.limit);
}

export async function getReport(reportId: string) {
  const report = await prisma.report.findUnique({ where: { id: reportId }, include: adminReportInclude });
  if (!report) throw notFound("Report not found.");
  const otherReportsOnListing = await prisma.report.count({
    where: { listingId: report.listingId, id: { not: reportId } },
  });
  return { report: toAdminReport(report), otherReportsOnListing };
}

/**
 * Admin works a report:
 *   REVIEWED      - "I'm looking at it" (still open)
 *   DISMISSED     - no problem found (closed)
 *   ACTION_TAKEN  - closed; optionally removes the listing in the same step
 */
export async function updateReport(adminId: string, reportId: string, input: AdminUpdateReportInput) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, listingId: true },
  });
  if (!report) throw notFound("Report not found.");
  if (report.status === "DISMISSED" || report.status === "ACTION_TAKEN") {
    throw conflict("This report has already been resolved.");
  }

  const closing = input.status !== "REVIEWED";
  const now = new Date();

  if (input.removeListing) {
    const listing = await prisma.listing.findUnique({
      where: { id: report.listingId },
      select: { status: true },
    });
    if (listing && listing.status !== "REMOVED") {
      // Also closes every other open report on the listing.
      await removeListing(adminId, report.listingId, input.removalReason!);
    }
  }

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: input.status,
      resolutionNote: input.resolutionNote ?? undefined,
      ...(closing ? { resolvedAt: now, resolvedById: adminId } : {}),
    },
  });

  return getReport(reportId);
}
