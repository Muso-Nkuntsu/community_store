import { z } from "zod";
import { CATEGORY_VALUES, PAGINATION, REPORT_REASON_VALUES, UPLOADS } from "@/lib/constants";

/**
 * All request validation lives here so the API and the frontend forms can
 * share the same rules (the frontend may import these schemas for client-side
 * hints, but the server always re-validates).
 */

// Strip ASCII control characters (except tab/newline) and surrounding spaces.
// eslint-disable-next-line no-control-regex
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

const text = (label: string, min: number, max: number) =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} must be text.` })
    .transform(clean)
    .pipe(
      z
        .string()
        .min(min, min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
        .max(max, `${label} must be at most ${max} characters.`),
    );

/**
 * Optional, clearable field:
 *   missing   -> undefined (leave unchanged on updates)
 *   null / "" -> null      (clear the value)
 *   "text"    -> normalised text, then validated by `inner`
 */
function clearable(normalize: (s: string) => string, inner: z.ZodType<string, z.ZodTypeDef, string>) {
  return z
    .union([z.string(), z.null()], { invalid_type_error: "Must be text or null." })
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null ? null : normalize(v) || null))
    .pipe(inner.nullable().optional());
}

const optionalText = (label: string, max: number) =>
  clearable(clean, z.string().max(max, `${label} must be at most ${max} characters.`));

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

export const idSchema = z
  .string({ required_error: "ID is required." })
  .regex(/^[a-z0-9]{20,40}$/i, "Invalid ID.");

export const emailSchema = z
  .string({ required_error: "Email is required." })
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().min(1, "Email is required.").max(255, "Email is too long.").email("Enter a valid email address."));

export const passwordSchema = z
  .string({ required_error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters."); // bcrypt only uses the first 72 bytes

export const nameSchema = text("Name", 2, 100);

export const studentIdSchema = clearable(
  (v) => v.trim().toUpperCase(),
  z.string().regex(/^[A-Z0-9-]{4,20}$/, "Student ID must be 4-20 letters, digits or dashes."),
);

export const phoneSchema = clearable(
  (v) => v.replace(/[\s()-]/g, ""),
  z.string().regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number, e.g. 0821234567 or +27821234567."),
);

export const categorySchema = z.enum(CATEGORY_VALUES, {
  errorMap: () => ({ message: `Category must be one of: ${CATEGORY_VALUES.join(", ")}.` }),
});

/**
 * Price arrives as a number or string and leaves as a string like "250.00".
 * It is never converted to a JS float for storage (Prisma writes it as DECIMAL).
 */
export const priceSchema = z
  .union([z.string(), z.number()], {
    required_error: "Price is required.",
    invalid_type_error: "Price must be a number.",
  })
  .transform((v) => (typeof v === "number" ? String(v) : v.trim().replace(/^R\s*/i, "")))
  .pipe(
    z
      .string()
      .min(1, "Price is required.")
      .regex(/^\d{1,8}(\.\d{1,2})?$/, "Price must be a positive amount with at most 2 decimal places.")
      .refine((v) => Number(v) > 0, "Price must be greater than zero.")
      .transform((v) => {
        const [whole, frac = ""] = v.split(".");
        return `${BigInt(whole!).toString()}.${frac.padEnd(2, "0")}`;
      }),
  );

const uploadedImagePath = new RegExp(`^${UPLOADS.publicPrefix.replace(/\//g, "\\/")}[a-f0-9]{32}\\.(jpg|png|webp)$`);

/** http(s) URL or an image uploaded through /api/uploads. Blocks javascript:, data:, etc. */
export const imageUrlSchema = clearable(
  (v) => v.trim(),
  z
    .string()
    .max(2048, "Image URL is too long.")
    .refine((v) => {
      if (uploadedImagePath.test(v)) return true;
      try {
        const url = new URL(v);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, "Image must be an http(s) URL or an uploaded image."),
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    studentId: studentIdSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string({ required_error: "Please confirm your password." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "Password is required." }).min(1, "Password is required.").max(200),
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
    studentId: studentIdSchema,
    phone: phoneSchema,
  })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Send at least one field to update.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: "Current password is required." }).min(1).max(200),
    newPassword: passwordSchema,
    confirmPassword: z.string({ required_error: "Please confirm your new password." }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const deleteAccountSchema = z.object({
  password: z.string({ required_error: "Enter your password to confirm." }).min(1, "Enter your password to confirm."),
});

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export const createListingSchema = z
  .object({
    title: text("Title", 3, 120),
    description: text("Description", 10, 5000),
    price: priceSchema,
    category: categorySchema,
    imageUrl: imageUrlSchema,
  })
  .strict();

export const updateListingSchema = z
  .object({
    title: text("Title", 3, 120).optional(),
    description: text("Description", 10, 5000).optional(),
    price: priceSchema.optional(),
    category: categorySchema.optional(),
    imageUrl: imageUrlSchema,
  })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Send at least one field to update.",
  });

const pageSchema = z.coerce.number().int("Page must be a whole number.").min(1).max(10_000).default(1);
const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(PAGINATION.maxLimit, `Limit must be at most ${PAGINATION.maxLimit}.`)
  .default(PAGINATION.defaultLimit);

const categoriesParam = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
      : [],
  )
  .pipe(z.array(categorySchema).max(CATEGORY_VALUES.length));

/** GET /api/listings?q=&categories=A,B&category=A&status=ACTIVE&sellerId=&page=&limit= */
export const listingQuerySchema = z
  .object({
    q: z
      .string()
      .optional()
      .transform((v) => (v ? clean(v).slice(0, 100) : undefined)),
    categories: categoriesParam,
    category: categoriesParam, // single-category form, merged below
    status: z.enum(["ACTIVE", "SOLD"]).optional(),
    sellerId: idSchema.optional(),
    page: pageSchema,
    limit: limitSchema,
  })
  .transform(({ category, categories, ...rest }) => ({
    ...rest,
    categories: [...new Set([...categories, ...category])],
  }));

export const myListingsQuerySchema = z.object({
  status: z.enum(["ACTIVE", "SOLD", "REMOVED"]).optional(),
  page: pageSchema,
  limit: limitSchema,
});

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

export const addWishlistSchema = z.object({ listingId: idSchema }).strict();

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const reportReasonSchema = z.enum(REPORT_REASON_VALUES, {
  errorMap: () => ({ message: "Choose a reason for the report." }),
});

export const createReportSchema = z
  .object({
    reason: reportReasonSchema,
    details: optionalText("Details", 1000),
  })
  .strict()
  .refine((d) => d.reason !== "OTHER" || (d.details && d.details.length >= 5), {
    path: ["details"],
    message: 'Please describe the problem when choosing "Other".',
  });

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const adminListQuerySchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => (v ? clean(v).slice(0, 100) : undefined)),
  page: pageSchema,
  limit: limitSchema,
});

export const adminUsersQuerySchema = adminListQuerySchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const adminListingsQuerySchema = adminListQuerySchema.extend({
  status: z.enum(["ACTIVE", "SOLD", "REMOVED"]).optional(),
  includeDeleted: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const adminReportsQuerySchema = adminListQuerySchema.omit({ q: true }).extend({
  status: z.enum(["PENDING", "REVIEWED", "DISMISSED", "ACTION_TAKEN", "OPEN"]).optional(),
});

export const removalReasonSchema = text("Removal reason", 5, 500);

export const adminRemoveListingSchema = z.object({ reason: removalReasonSchema }).strict();

export const adminUpdateUserSchema = z
  .object({
    isActive: z.boolean({ required_error: "isActive is required.", invalid_type_error: "isActive must be true or false." }),
    reason: optionalText("Reason", 500),
  })
  .strict();

export const adminUpdateReportSchema = z
  .object({
    status: z.enum(["REVIEWED", "DISMISSED", "ACTION_TAKEN"], {
      errorMap: () => ({ message: "Status must be REVIEWED, DISMISSED or ACTION_TAKEN." }),
    }),
    resolutionNote: optionalText("Resolution note", 1000),
    removeListing: z.boolean().optional().default(false),
    removalReason: optionalText("Removal reason", 500),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.removeListing && d.status !== "ACTION_TAKEN") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["removeListing"],
        message: "Removing the listing is only allowed with status ACTION_TAKEN.",
      });
    }
    if (d.removeListing && (!d.removalReason || d.removalReason.length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["removalReason"],
        message: "A removal reason (at least 5 characters) is required to remove the listing.",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type AdminUpdateReportInput = z.infer<typeof adminUpdateReportSchema>;
