import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, badRequest, conflict, notFound, unauthorized, forbidden } from "@/lib/api";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth";
import { listingCardInclude, paginate, toListingCard, toPrivateUser } from "@/lib/serializers";
import { publicListingWhere } from "@/lib/services/listing-service";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "@/lib/validations";
import { PAGINATION } from "@/lib/constants";

const privateUserSelect = {
  id: true,
  name: true,
  email: true,
  studentId: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

/** Turns a unique-constraint violation into a friendly field error. */
function uniqueViolation(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = String((error.meta?.target as string[] | string | undefined) ?? "");
    if (target.includes("studentId")) {
      throw new ApiError(409, "That student ID is already registered.", {
        studentId: ["That student ID is already registered."],
      });
    }
    throw new ApiError(409, "An account with that email already exists.", {
      email: ["An account with that email already exists."],
    });
  }
  throw error;
}

async function assertUnique(email: string | undefined, studentId: string | null | undefined, exceptUserId?: string) {
  if (email) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing && existing.id !== exceptUserId) {
      throw new ApiError(409, "An account with that email already exists.", {
        email: ["An account with that email already exists."],
      });
    }
  }
  if (studentId) {
    const existing = await prisma.user.findUnique({ where: { studentId }, select: { id: true } });
    if (existing && existing.id !== exceptUserId) {
      throw new ApiError(409, "That student ID is already registered.", {
        studentId: ["That student ID is already registered."],
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Registration and login
// ---------------------------------------------------------------------------

export async function registerUser(input: RegisterInput) {
  await assertUnique(input.email, input.studentId);
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        studentId: input.studentId ?? null,
        phone: input.phone ?? null,
        passwordHash,
      },
      select: privateUserSelect,
    });
    return toPrivateUser(user);
  } catch (error) {
    uniqueViolation(error); // race between the check above and the insert
  }
}

/**
 * Checks email + password. Deactivated accounts are rejected, but only after
 * the password is verified, so the response doesn't reveal account status to
 * someone who doesn't know the password.
 */
export async function authenticate(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...privateUserSelect, passwordHash: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    await burnPasswordCheck(input.password);
    throw unauthorized("Invalid email or password.");
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid email or password.");
  if (!user.isActive) {
    throw forbidden("This account has been deactivated. Please contact an administrator.");
  }
  return toPrivateUser(user);
}

// ---------------------------------------------------------------------------
// Own profile
// ---------------------------------------------------------------------------

export async function getMyProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: privateUserSelect });
  if (!user) throw notFound("User not found.");

  const [activeListings, soldListings, wishlistCount, recentListings] = await prisma.$transaction([
    prisma.listing.count({ where: { sellerId: userId, status: "ACTIVE", deletedAt: null } }),
    prisma.listing.count({ where: { sellerId: userId, status: "SOLD", deletedAt: null } }),
    prisma.wishlistItem.count({ where: { userId } }),
    prisma.listing.findMany({
      where: { sellerId: userId, deletedAt: null },
      include: listingCardInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  ]);

  return {
    user: toPrivateUser(user),
    // Everything the user dashboard needs in one call.
    stats: { activeListings, soldListings, wishlistCount },
    recentListings: recentListings.map(toListingCard),
  };
}

export async function updateMyProfile(userId: string, input: UpdateProfileInput) {
  await assertUnique(input.email, input.studentId, userId);
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.studentId !== undefined && { studentId: input.studentId }),
        ...(input.phone !== undefined && { phone: input.phone }),
      },
      select: privateUserSelect,
    });
    return toPrivateUser(user);
  } catch (error) {
    uniqueViolation(error);
  }
}

export async function changePassword(
  userId: string,
  currentSessionId: string | null,
  input: { currentPassword: string; newPassword: string },
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw notFound("User not found.");
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new ApiError(400, "Current password is incorrect.", { currentPassword: ["Current password is incorrect."] });
  }
  if (input.currentPassword === input.newPassword) {
    throw badRequest("Choose a new password that is different from the current one.");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.newPassword) } }),
    // Log out every other device; keep the session that made the change.
    prisma.session.deleteMany({
      where: { userId, ...(currentSessionId ? { id: { not: currentSessionId } } : {}) },
    }),
  ]);
}

/**
 * Account deletion, handled safely:
 * - requires the password again;
 * - the last remaining admin cannot delete themselves;
 * - personal data is wiped and the email/student ID are released, but the row
 *   stays so reports and moderation records that reference it remain valid;
 * - the user's listings are soft-deleted, wishlist and sessions removed.
 */
export async function deleteMyAccount(userId: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, passwordHash: true },
  });
  if (!user) throw notFound("User not found.");
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(400, "Password is incorrect.", { password: ["Password is incorrect."] });
  }

  if (user.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", isActive: true, deletedAt: null, id: { not: userId } },
    });
    if (otherAdmins === 0) {
      throw conflict("You are the only administrator. Make another user an admin before deleting this account.");
    }
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.listing.updateMany({ where: { sellerId: userId, deletedAt: null }, data: { deletedAt: now } }),
    prisma.wishlistItem.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        name: "Deleted user",
        email: `deleted-${userId}@deleted.invalid`,
        studentId: null,
        phone: null,
        // Random hash nobody knows - the account can never be logged into again.
        passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
        isActive: false,
        deletedAt: now,
      },
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Public seller profile
// ---------------------------------------------------------------------------

export async function getSellerProfile(sellerId: string) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, isActive: true, deletedAt: true },
  });
  if (!seller || !seller.isActive || seller.deletedAt) throw notFound("Seller not found.");

  const activeWhere = { ...publicListingWhere, sellerId, status: "ACTIVE" as const };
  const limit = PAGINATION.defaultLimit;

  const [activeCount, soldCount, listings] = await prisma.$transaction([
    prisma.listing.count({ where: activeWhere }),
    prisma.listing.count({ where: { ...publicListingWhere, sellerId, status: "SOLD" } }),
    prisma.listing.findMany({
      where: activeWhere,
      include: listingCardInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
    }),
  ]);

  return {
    seller: {
      id: seller.id,
      name: seller.name,
      memberSince: seller.createdAt,
      contact: {
        email: seller.email,
        phone: seller.phone,
        mailto: `mailto:${seller.email}`,
        tel: seller.phone ? `tel:${seller.phone}` : null,
      },
      stats: { activeListings: activeCount, soldListings: soldCount },
    },
    // First page of active listings. More: GET /api/listings?sellerId=<id>&status=ACTIVE&page=2
    activeListings: paginate(listings.map(toListingCard), activeCount, 1, limit),
  };
}

