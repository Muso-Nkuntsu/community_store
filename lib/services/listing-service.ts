import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conflict, forbidden, notFound } from "@/lib/api";
import {
  listingCardInclude,
  listingDetailInclude,
  paginate,
  toListingCard,
  toListingDetail,
} from "@/lib/serializers";
import type { CreateListingInput, ListingQuery, UpdateListingInput } from "@/lib/validations";
import type { SessionUser } from "@/lib/session";

/**
 * Listings the public can see: not deleted by the seller, not removed by an
 * admin, and belonging to an active (non-deactivated) seller.
 */
export const publicListingWhere = {
  deletedAt: null,
  status: { in: ["ACTIVE", "SOLD"] },
  seller: { isActive: true, deletedAt: null },
} satisfies Prisma.ListingWhereInput;

const newestFirst: Prisma.ListingOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

/** Browse / search / filter. All filtering happens in MySQL, never in the browser. */
export async function searchListings(query: ListingQuery) {
  const { q, categories, status, sellerId, page, limit } = query;

  const where: Prisma.ListingWhereInput = {
    ...publicListingWhere,
    ...(status ? { status } : {}),
    ...(categories.length ? { category: { in: categories } } : {}),
    ...(sellerId ? { sellerId } : {}),
    // MySQL's default utf8mb4 collation makes `contains` case-insensitive.
    ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
  };

  const [total, rows] = await prisma.$transaction([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      include: listingCardInclude,
      orderBy: newestFirst,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return paginate(rows.map(toListingCard), total, page, limit);
}

/**
 * One listing for the detail page.
 * - Public listings are visible to everyone.
 * - A REMOVED listing is visible only to its owner (with the removal reason) and admins.
 * - A listing the seller deleted is gone for everyone (admins use /api/admin/listings).
 */
export async function getListingDetail(id: string, viewer: SessionUser | null) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { ...listingDetailInclude, seller: { select: { ...listingDetailInclude.seller.select, isActive: true } } },
  });
  if (!listing || listing.deletedAt) throw notFound("Listing not found.");

  const isOwner = viewer?.id === listing.sellerId;
  const isAdmin = viewer?.role === "ADMIN";
  const publiclyVisible = listing.status !== "REMOVED" && listing.seller.isActive;
  if (!publiclyVisible && !isOwner && !isAdmin) throw notFound("Listing not found.");

  return toListingDetail(listing, viewer);
}

export async function createListing(seller: SessionUser, input: CreateListingInput) {
  const listing = await prisma.listing.create({
    data: {
      title: input.title,
      description: input.description,
      price: input.price,
      category: input.category,
      imageUrl: input.imageUrl ?? null,
      sellerId: seller.id,
      // status defaults to ACTIVE
    },
    include: listingDetailInclude,
  });
  return toListingDetail(listing, seller);
}

/**
 * Loads a listing and proves the caller owns it. Ownership is always checked
 * here on the server, so changing an ID in a request cannot touch someone
 * else's listing.
 */
async function getOwnedListing(id: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.deletedAt) throw notFound("Listing not found.");
  if (listing.sellerId !== userId) throw forbidden("You can only change your own listings.");
  return listing;
}

export async function updateListing(id: string, user: SessionUser, input: UpdateListingInput) {
  const listing = await getOwnedListing(id, user.id);
  if (listing.status === "REMOVED") {
    throw conflict("This listing was removed by an administrator and can no longer be edited.");
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
    },
    include: listingDetailInclude,
  });
  return toListingDetail(updated, user);
}

/**
 * Seller deletes their own listing. This is a soft delete (`deletedAt`) so
 * any reports and moderation history pointing at it are preserved. The
 * listing disappears from browse, search, seller profiles and wishlists.
 */
export async function deleteListing(id: string, user: SessionUser) {
  await getOwnedListing(id, user.id);
  await prisma.listing.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function markListingSold(id: string, user: SessionUser) {
  const listing = await getOwnedListing(id, user.id);
  if (listing.status === "SOLD") throw conflict("This listing is already marked as sold.");
  if (listing.status !== "ACTIVE") throw conflict("Only active listings can be marked as sold.");

  // Conditional update guards against a race with an admin removal.
  const { count } = await prisma.listing.updateMany({
    where: { id, sellerId: user.id, status: "ACTIVE", deletedAt: null },
    data: { status: "SOLD", soldAt: new Date() },
  });
  if (count === 0) throw conflict("This listing can no longer be marked as sold.");

  return getListingDetail(id, user);
}

/** The seller's own listings in every state except deleted (My Listings page). */
export async function listMyListings(
  userId: string,
  query: { status?: "ACTIVE" | "SOLD" | "REMOVED"; page: number; limit: number },
) {
  const where: Prisma.ListingWhereInput = {
    sellerId: userId,
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      include: listingCardInclude,
      orderBy: newestFirst,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return paginate(
    rows.map((l) => ({
      ...toListingCard(l),
      removalReason: l.status === "REMOVED" ? l.removalReason : null,
      soldAt: l.soldAt,
    })),
    total,
    query.page,
    query.limit,
  );
}
