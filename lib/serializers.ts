import type { Listing, Prisma, User } from "@prisma/client";
import {
  CATEGORY_LABELS,
  LISTING_STATUS_LABELS,
  PLACEHOLDER_IMAGE_URL,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
} from "@/lib/constants";

/**
 * Serializers turn database rows into the JSON shapes the frontend receives.
 * They are the single place that decides which fields leave the server:
 * password hashes, session data and moderation-only fields never appear in
 * public responses.
 */

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** What anyone can see about a seller. */
export const publicSellerSelect = {
  id: true,
  name: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

/** Adds contact details - shown on active listings and seller profiles. */
export const sellerContactSelect = {
  ...publicSellerSelect,
  email: true,
  phone: true,
} satisfies Prisma.UserSelect;

type PrivateUserRow = Pick<
  User,
  "id" | "name" | "email" | "studentId" | "phone" | "role" | "isActive" | "createdAt" | "updatedAt"
>;

/** The logged-in user's own profile. */
export function toPrivateUser(u: PrivateUserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    studentId: u.studentId,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}
export type PrivateUserDTO = ReturnType<typeof toPrivateUser>;

type AdminUserRow = PrivateUserRow &
  Pick<User, "deactivatedAt" | "deactivationReason" | "deletedAt"> & {
    deactivatedBy?: { id: string; name: string } | null;
    _count?: { listings: number; reports: number };
  };

export function toAdminUser(u: AdminUserRow) {
  return {
    ...toPrivateUser(u),
    isDeleted: u.deletedAt !== null,
    deletedAt: u.deletedAt,
    deactivatedAt: u.deactivatedAt,
    deactivationReason: u.deactivationReason,
    deactivatedBy: u.deactivatedBy ?? null,
    listingCount: u._count?.listings,
    reportsFiled: u._count?.reports,
  };
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export const listingCardInclude = {
  seller: { select: publicSellerSelect },
} satisfies Prisma.ListingInclude;

export const listingDetailInclude = {
  seller: { select: sellerContactSelect },
} satisfies Prisma.ListingInclude;

type ListingWithSeller = Listing & {
  seller: { id: string; name: string; createdAt: Date; email?: string; phone?: string | null };
};

/** Card shape for grids: browse, search, seller profile, wishlist. */
export function toListingCard(l: ListingWithSeller) {
  return {
    id: l.id,
    title: l.title,
    price: l.price.toFixed(2), // decimal string, e.g. "250.00" - never a float
    category: l.category,
    categoryLabel: CATEGORY_LABELS[l.category],
    imageUrl: l.imageUrl,
    displayImageUrl: l.imageUrl ?? PLACEHOLDER_IMAGE_URL,
    status: l.status,
    statusLabel: LISTING_STATUS_LABELS[l.status],
    isAvailable: l.status === "ACTIVE" && l.deletedAt === null,
    seller: { id: l.seller.id, name: l.seller.name },
    createdAt: l.createdAt,
  };
}
export type ListingCardDTO = ReturnType<typeof toListingCard>;

/**
 * Detail page. Contact details are only included while the listing is ACTIVE,
 * so a SOLD listing cannot be contacted through the platform.
 */
export function toListingDetail(l: ListingWithSeller, viewer: { id: string; role: string } | null) {
  const isOwner = viewer?.id === l.sellerId;
  const isAdmin = viewer?.role === "ADMIN";
  const available = l.status === "ACTIVE" && l.deletedAt === null;

  return {
    ...toListingCard(l),
    description: l.description,
    updatedAt: l.updatedAt,
    soldAt: l.soldAt,
    seller: {
      id: l.seller.id,
      name: l.seller.name,
      memberSince: l.seller.createdAt,
    },
    contact:
      available && l.seller.email
        ? {
            email: l.seller.email,
            phone: l.seller.phone ?? null,
            mailto: `mailto:${l.seller.email}?subject=${encodeURIComponent(`Community Store: ${l.title}`)}`,
            tel: l.seller.phone ? `tel:${l.seller.phone}` : null,
          }
        : null,
    canContact: available && !isOwner,
    viewer: {
      isOwner,
      canEdit: isOwner && l.status !== "REMOVED",
      canMarkSold: isOwner && l.status === "ACTIVE",
      canDelete: isOwner,
      canReport: viewer !== null && !isOwner,
      canWishlist: viewer !== null && !isOwner && available,
    },
    // Owners and admins can see why a listing was taken down.
    moderation:
      l.status === "REMOVED" && (isOwner || isAdmin)
        ? { removedAt: l.removedAt, removalReason: l.removalReason }
        : null,
  };
}
export type ListingDetailDTO = ReturnType<typeof toListingDetail>;

type AdminListingRow = Listing & {
  seller: { id: string; name: string; email: string; isActive: boolean };
  removedBy: { id: string; name: string } | null;
  _count: { reports: number };
};

export function toAdminListing(l: AdminListingRow) {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    price: l.price.toFixed(2),
    category: l.category,
    categoryLabel: CATEGORY_LABELS[l.category],
    imageUrl: l.imageUrl,
    displayImageUrl: l.imageUrl ?? PLACEHOLDER_IMAGE_URL,
    status: l.status,
    statusLabel: LISTING_STATUS_LABELS[l.status],
    isDeletedBySeller: l.deletedAt !== null,
    deletedAt: l.deletedAt,
    soldAt: l.soldAt,
    removedAt: l.removedAt,
    removalReason: l.removalReason,
    removedBy: l.removedBy,
    seller: l.seller,
    reportCount: l._count.reports,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

type ReportRow = Prisma.ReportGetPayload<{
  include: {
    listing: { select: { id: true; title: true; status: true; deletedAt: true; sellerId: true } };
    reporter: { select: { id: true; name: true; email: true } };
    resolvedBy: { select: { id: true; name: true } };
  };
}>;

export const adminReportInclude = {
  listing: { select: { id: true, title: true, status: true, deletedAt: true, sellerId: true } },
  reporter: { select: { id: true, name: true, email: true } },
  resolvedBy: { select: { id: true, name: true } },
} satisfies Prisma.ReportInclude;

export function toAdminReport(r: ReportRow) {
  return {
    id: r.id,
    reason: r.reason,
    reasonLabel: REPORT_REASON_LABELS[r.reason],
    details: r.details,
    status: r.status,
    statusLabel: REPORT_STATUS_LABELS[r.status],
    resolutionNote: r.resolutionNote,
    resolvedAt: r.resolvedAt,
    resolvedBy: r.resolvedBy,
    listing: {
      id: r.listing.id,
      title: r.listing.title,
      status: r.listing.status,
      isDeletedBySeller: r.listing.deletedAt !== null,
      sellerId: r.listing.sellerId,
    },
    reporter: r.reporter,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** A reporter's view of their own report - no admin notes or admin identity. */
export function toOwnReport(r: {
  id: string;
  reason: ReportRow["reason"];
  status: ReportRow["status"];
  createdAt: Date;
  resolvedAt: Date | null;
  listing: { id: string; title: string };
}) {
  return {
    id: r.id,
    reason: r.reason,
    reasonLabel: REPORT_REASON_LABELS[r.reason],
    status: r.status,
    statusLabel: REPORT_STATUS_LABELS[r.status],
    listing: r.listing,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  };
}
