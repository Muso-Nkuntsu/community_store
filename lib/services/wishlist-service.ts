import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { badRequest, conflict, notFound } from "@/lib/api";
import { listingCardInclude, toListingCard } from "@/lib/serializers";
import { publicListingWhere } from "@/lib/services/listing-service";

export async function getWishlist(userId: string) {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: { ...listingCardInclude, seller: { select: { ...listingCardInclude.seller.select, isActive: true } } },
      },
    },
  });

  return {
    items: items.map((item) => {
      const l = item.listing;
      // Listings can disappear after being saved. Keep the entry but tell the
      // frontend why it is no longer available, instead of failing.
      let unavailableReason: "SOLD" | "REMOVED" | "DELETED" | null = null;
      if (l.deletedAt || !l.seller.isActive) unavailableReason = "DELETED";
      else if (l.status === "REMOVED") unavailableReason = "REMOVED";
      else if (l.status === "SOLD") unavailableReason = "SOLD";

      return {
        id: item.id,
        addedAt: item.createdAt,
        isAvailable: unavailableReason === null,
        unavailableReason,
        // Removed/deleted listings only expose their title, not their contents.
        listing:
          unavailableReason === "DELETED" || unavailableReason === "REMOVED"
            ? { id: l.id, title: l.title }
            : toListingCard(l),
      };
    }),
  };
}

export async function addToWishlist(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, ...publicListingWhere },
    select: { id: true, sellerId: true, status: true },
  });
  if (!listing) throw notFound("Listing not found.");
  if (listing.sellerId === userId) throw badRequest("You cannot add your own listing to your wishlist.");
  if (listing.status !== "ACTIVE") throw conflict("Only available listings can be added to your wishlist.");

  try {
    const item = await prisma.wishlistItem.create({ data: { userId, listingId } });
    return { id: item.id, listingId, addedAt: item.createdAt };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw conflict("This listing is already in your wishlist.");
    }
    throw error;
  }
}

export async function removeFromWishlist(userId: string, listingId: string) {
  const { count } = await prisma.wishlistItem.deleteMany({ where: { userId, listingId } });
  if (count === 0) throw notFound("That listing is not in your wishlist.");
}

/** Lets the detail page show a filled/empty heart without loading the full wishlist. */
export async function isInWishlist(userId: string, listingId: string) {
  const item = await prisma.wishlistItem.findUnique({
    where: { userId_listingId: { userId, listingId } },
    select: { id: true },
  });
  return item !== null;
}
