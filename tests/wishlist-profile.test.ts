import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as getWishlist, POST as addWishlist } from "@/app/api/wishlist/route";
import { DELETE as removeWishlist } from "@/app/api/wishlist/[listingId]/route";
import { GET as getMe, PATCH as updateMe, DELETE as deleteMe } from "@/app/api/users/me/route";
import { POST as login } from "@/app/api/auth/login/route";
import { call, createListing, createUser, loginAs, resetDb, TEST_PASSWORD } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("wishlist", () => {
  it("adds, lists and removes a listing", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing(seller.id);
    const cookie = await loginAs(buyer.email);

    const add = await call(addWishlist, { method: "POST", cookie, body: { listingId: listing.id } });
    expect(add.status).toBe(201);

    const list = await call(getWishlist, { cookie });
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].isAvailable).toBe(true);

    const del = await call(removeWishlist, { method: "DELETE", cookie, params: { listingId: listing.id } });
    expect(del.status).toBe(200);
    expect((await call(getWishlist, { cookie })).body.items).toHaveLength(0);
  });

  it("prevents duplicate entries", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing(seller.id);
    const cookie = await loginAs(buyer.email);

    expect((await call(addWishlist, { method: "POST", cookie, body: { listingId: listing.id } })).status).toBe(201);
    expect((await call(addWishlist, { method: "POST", cookie, body: { listingId: listing.id } })).status).toBe(409);
    expect(await prisma.wishlistItem.count()).toBe(1);
  });

  it("rejects own, sold, removed and non-existent listings", async () => {
    const seller = await createUser();
    const own = await createListing(seller.id);
    const other = await createUser();
    const sold = await createListing(other.id, { status: "SOLD" });
    const removed = await createListing(other.id, { status: "REMOVED" });
    const cookie = await loginAs(seller.email);

    const add = (listingId: string) => call(addWishlist, { method: "POST", cookie, body: { listingId } });
    expect((await add(own.id)).status).toBe(400);
    expect((await add(sold.id)).status).toBe(409);
    expect((await add(removed.id)).status).toBe(404);
    expect((await add("cknotarealid0000000000000")).status).toBe(404);
  });

  it("keeps an entry but flags it when the listing becomes unavailable", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing(seller.id);
    const cookie = await loginAs(buyer.email);
    await call(addWishlist, { method: "POST", cookie, body: { listingId: listing.id } });

    await prisma.listing.update({ where: { id: listing.id }, data: { status: "SOLD" } });
    const { body } = await call(getWishlist, { cookie });
    expect(body.items[0]).toMatchObject({ isAvailable: false, unavailableReason: "SOLD" });
  });

  it("removing something not in the wishlist is a 404", async () => {
    const buyer = await createUser();
    const cookie = await loginAs(buyer.email);
    const { status } = await call(removeWishlist, {
      method: "DELETE",
      cookie,
      params: { listingId: "cknotarealid0000000000000" },
    });
    expect(status).toBe(404);
  });
});

describe("profile", () => {
  it("returns the profile with dashboard stats and no password hash", async () => {
    const user = await createUser();
    await createListing(user.id);
    await createListing(user.id, { status: "SOLD" });
    const cookie = await loginAs(user.email);

    const { status, body } = await call(getMe, { cookie });
    expect(status).toBe(200);
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(body.stats).toMatchObject({ activeListings: 1, soldListings: 1, wishlistCount: 0 });
  });

  it("updates name and phone, and clears phone with null", async () => {
    const user = await createUser();
    const cookie = await loginAs(user.email);

    const first = await call(updateMe, { method: "PATCH", cookie, body: { name: "New Name", phone: "082 123 4567" } });
    expect(first.status).toBe(200);
    expect(first.body.user).toMatchObject({ name: "New Name", phone: "0821234567" });

    const second = await call(updateMe, { method: "PATCH", cookie, body: { phone: null } });
    expect(second.body.user).toMatchObject({ name: "New Name", phone: null });
  });

  it("deletes the account safely: needs the password, anonymises, logs out", async () => {
    const user = await createUser();
    const listing = await createListing(user.id);
    const cookie = await loginAs(user.email);

    expect((await call(deleteMe, { method: "DELETE", cookie, body: { password: "wrong" } })).status).toBe(400);

    const { status } = await call(deleteMe, { method: "DELETE", cookie, body: { password: TEST_PASSWORD } });
    expect(status).toBe(200);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.deletedAt).not.toBeNull();
    expect(stored.email).not.toBe(user.email);
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } })).deletedAt).not.toBeNull();

    expect((await call(getMe, { cookie })).status).toBe(401);
    const relogin = await call(login, { method: "POST", body: { email: user.email, password: TEST_PASSWORD } });
    expect(relogin.status).toBe(401);
  });

  it("the only admin cannot delete their account", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const cookie = await loginAs(admin.email);
    const { status } = await call(deleteMe, { method: "DELETE", cookie, body: { password: TEST_PASSWORD } });
    expect(status).toBe(409);
  });
});
