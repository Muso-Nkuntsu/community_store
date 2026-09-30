import { prisma } from "@/lib/prisma";
import { badRequest, conflict, notFound } from "@/lib/api";
import { toOwnReport } from "@/lib/serializers";
import type { CreateReportInput } from "@/lib/validations";

/**
 * A logged-in user reports a listing.
 * - You can't report your own listing.
 * - Removed or deleted listings can't be reported (nothing left to act on).
 * - One open (PENDING/REVIEWED) report per user per listing, to stop spam.
 */
export async function createReport(reporterId: string, listingId: string, input: CreateReportInput) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, sellerId: true, status: true, deletedAt: true },
  });
  if (!listing || listing.deletedAt || listing.status === "REMOVED") throw notFound("Listing not found.");
  if (listing.sellerId === reporterId) throw badRequest("You cannot report your own listing.");

  const open = await prisma.report.findFirst({
    where: { listingId, reporterId, status: { in: ["PENDING", "REVIEWED"] } },
    select: { id: true },
  });
  if (open) throw conflict("You have already reported this listing. An administrator will review it.");

  const report = await prisma.report.create({
    data: { listingId, reporterId, reason: input.reason, details: input.details ?? null },
    include: { listing: { select: { id: true, title: true } } },
  });

  return {
    message: "Your report has been received.",
    report: toOwnReport(report),
  };
}

/** Reports the current user has filed, so they can see their status. */
export async function listMyReports(reporterId: string) {
  const reports = await prisma.report.findMany({
    where: { reporterId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { listing: { select: { id: true, title: true } } },
  });
  return { items: reports.map(toOwnReport) };
}
