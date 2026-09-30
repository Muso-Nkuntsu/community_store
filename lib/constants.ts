import type { Category, ReportReason, ReportStatus, ListingStatus } from "@prisma/client";

export const CATEGORY_VALUES = [
  "TEXTBOOKS",
  "ELECTRONICS",
  "SERVICES",
  "CLOTHING",
  "FURNITURE",
  "OTHER",
] as const satisfies readonly Category[];

export const CATEGORY_LABELS: Record<Category, string> = {
  TEXTBOOKS: "Textbooks",
  ELECTRONICS: "Electronics",
  SERVICES: "Services",
  CLOTHING: "Clothing",
  FURNITURE: "Furniture",
  OTHER: "Other",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  ACTIVE: "Available",
  SOLD: "Sold",
  REMOVED: "Removed",
};

export const REPORT_REASON_VALUES = [
  "FRAUD",
  "INAPPROPRIATE",
  "INCORRECT_INFO",
  "SPAM",
  "OTHER",
] as const satisfies readonly ReportReason[];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  FRAUD: "Fraud / suspicious listing",
  INAPPROPRIATE: "Inappropriate content",
  INCORRECT_INFO: "Incorrect information",
  SPAM: "Spam",
  OTHER: "Other",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: "Pending",
  REVIEWED: "Under review",
  DISMISSED: "Dismissed",
  ACTION_TAKEN: "Action taken",
};

/** Shown by the frontend when a listing has no image. */
export const PLACEHOLDER_IMAGE_URL = "/placeholder-listing.svg";

export const PAGINATION = {
  defaultLimit: 12,
  maxLimit: 50,
} as const;

export const SESSION = {
  cookieName: "cs_session",
  /** Requirement: sessions expire after 30 minutes of inactivity. */
  idleTimeoutMs: 30 * 60 * 1000,
  /** Hard cap regardless of activity. */
  absoluteLifetimeMs: 12 * 60 * 60 * 1000,
  /** Only write lastActivityAt to the DB once a minute, not on every request. */
  touchIntervalMs: 60 * 1000,
} as const;

export const UPLOADS = {
  maxBytes: 2 * 1024 * 1024,
  dir: "storage/uploads",
  publicPrefix: "/api/uploads/",
} as const;
