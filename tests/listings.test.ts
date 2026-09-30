import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as browse, POST as create } from "@/app/api/listings/route";
import { GET as detail, PATCH as update, DELETE as remove } from "@/app/api/listings/[id]/route";
import { POST as markSold } from "@/app/api/listings/[id]/sold/route";
import { GET as myListings } from "@/app/api/users/me/listings/route";
import { GET as sellerProfile } from "@/app/api/users/[id]/route";
import { call, createListing, createUser, loginAs, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const newListing = {
  title: "Java Programming textbook",
  description: "Deitel, 11th edition, good condition.",
  price: "250",
  category: "TEXTBOOKS",
};

describe("create listing", () => {
  it("creates an ACTIVE listing owned by the logged-in user", async () => {
    const seller = await createUser();
    const cookie = await loginAs(seller.email);

    const { status, body } = await call(create, { method: "POST", cookie, body: newListing });
    expect(status).toBe(201);
    expect(body.listing.status).toBe("ACTIVE");
    expect(body.listing.price).toBe("250.00");
    expect(body.listing.seller.id).toBe(seller.id);

    // Immediately visible in browse
    const list = await call(browse, { path: "/api/listings" });
    expect(list.body.items.map((l: { id: string }) => l.id)).toContain(body.listing.id);
  });

  it("requires login", async () => {
    const { status } = await call(create, { method: "POST", body: newListing });
    expect(status).toBe(401);
  });

  it("validates required fields and price > 0", async () => {
    const seller = await createUser();
    const cookie = await loginAs(seller.email);
    const { status, body } = await call(create, {
      method: "POST",
      cookie,
      body: { title: "", description: "", price: "0", category: "CARS" },
    });
    expect(status).toBe(400);
    expect(Object.keys(body.error.fields)).toEqual(
      expect.arrayContaining(["title", "description", "price", "category"]),
    );
  });

  it("rejects unsafe image URLs", async () => {
    const seller = await createUser();
    const cookie = await loginAs(seller.email);
    const { status, body } = await call(create, {
      method: "POST",
      cookie,
      body: { ...newListing, imageUrl: "javascript:alert(1)" },
    });
    expect(status).toBe(400);
    expect(body.error.fields.imageUrl).toBeDefined();
  });

  it("rejects attempts to set seller or status from the client", async () => {
    const seller = await createUser();
    const cookie = await loginAs(seller.email);
    const { status } = await call(create, {
      method: "POST",
      cookie,
      body: { ...newListing, sellerId: "someoneelse00000000000", status: "SOLD" },
    });
    expect(status).toBe(400); // unknown fields are rejected outright
  });
});

describe("browse, search and filter", () => {
  it("is public, newest first, paginated", async () => {
    const seller = await createUser();
    const older = await createListing(seller.id, { title: "Older", createdAt: new Date(Date.now() - 60_000) });
    const newer = await createListing(seller.id, { title: "Newer" });

    const { status, body } = await call(browse, { path: "/api/listings?page=1&limit=1" });
    expect(status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(newer.id);
    expect(body).toMatchObject({ page: 1, limit: 1, total: 2, totalPages: 2 });

    const page2 = await call(browse, { path: "/api/listings?page=2&limit=1" });
    expect(page2.body.items[0].id).toBe(older.id);
  });

  it("searches title and description", async () => {
    const seller = await createUser();
    await createListing(seller.id, { title: "Java textbook" });
    await createListing(seller.id, { title: "Desk", description: "Great for studying JAVA at night" });
    await createListing(seller.id, { title: "Bicycle" });

    const { body } = await call(browse, { path: "/api/listings?q=java" });
    expect(body.total).toBe(2);
  });

  it("filters by multiple categories combined with search", async () => {
    const seller = await createUser();
    await createListing(seller.id, { title: "Java book", category: "TEXTBOOKS" });
    await createListing(seller.id, { title: "Java laptop sticker", category: "ELECTRONICS" });
    await createListing(seller.id, { title: "Java hoodie", category: "CLOTHING" });
    await createListing(seller.id, { title: "Maths book", category: "TEXTBOOKS" });

    const { body } = await call(browse, { path: "/api/listings?q=java&categories=TEXTBOOKS,ELECTRONICS" });
    expect(body.total).toBe(2);
    expect(body.items.map((l: { title: string }) => l.title).sort()).toEqual(["Java book", "Java laptop sticker"]);

    const single = await call(browse, { path: "/api/listings?category=CLOTHING" });
    expect(single.body.total).toBe(1);
  });

  it("returns an empty page when nothing matches", async () => {
    const { status, body } = await call(browse, { path: "/api/listings?q=zzzz" });
    expect(status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("rejects an invalid category", async () => {
    const { status } = await call(browse, { path: "/api/listings?categories=CARS" });
    expect(status).toBe(400);
  });

  it("hides removed, deleted and deactivated-seller listings", async () => {
    const seller = await createUser();
    const blocked = await createUser({ isActive: false });
    await createListing(seller.id, { title: "visible" });
    await createListing(seller.id, { title: "removed", status: "REMOVED" });
    const deleted = await createListing(seller.id, { title: "deleted" });
    await prisma.listing.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } });
    await createListing(blocked.id, { title: "blocked seller" });

    const { body } = await call(browse, { path: "/api/listings" });
    expect(body.items.map((l: { title: string }) => l.title)).toEqual(["visible"]);
  });
});

describe("listing detail", () => {
  it("shows contact details for an active listing", async () => {
    const seller = await createUser();
    const listing = await createListing(seller.id);
    const { status, body } = await call(detail, { params: { id: listing.id } });
    expect(status).toBe(200);
    expect(body.listing.contact.email).toBe(seller.email);
    expect(body.listing.canContact).toBe(true);
  });

  it("returns 404 for an unknown listing", async () => {
    const { status } = await call(detail, { params: { id: "cknotarealid0000000000000" } });
    expect(status).toBe(404);
  });

  it("returns 400 for a malformed id", async () => {
    const { status } = await call(detail, { params: { id: "../../etc/passwd" } });
    expect(status).toBe(400);
  });
});

describe("edit and delete (ownership)", () => {
  it("lets the owner edit their listing", async () => {
    const seller = await createUser();
    const listing = await createListing(seller.id);
    const cookie = await loginAs(seller.email);

    const { status, body } = await call(update, {
      method: "PATCH",
      cookie,
      params: { id: listing.id },
      body: { title: "Updated title", price: 199.99 },
    });
    expect(status).toBe(200);
    expect(body.listing.title).toBe("Updated title");
    expect(body.listing.price).toBe("199.99");
  });

  it("forbids editing someone else's listing (403) and changes nothing", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const listing = await createListing(owner.id, { title: "Original" });
    const cookie = await loginAs(attacker.email);

    const { status } = await call(update, {
      method: "PATCH",
      cookie,
      params: { id: listing.id },
      body: { title: "Hacked" },
    });
    expect(status).toBe(403);
    const unchanged = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(unchanged.title).toBe("Original");
  });

  it("lets the owner delete; the listing leaves browse results but history is kept", async () => {
    const seller = await createUser();
    const listing = await createListing(seller.id);
    const cookie = await loginAs(seller.email);

    const { status } = await call(remove, { method: "DELETE", cookie, params: { id: listing.id } });
    expect(status).toBe(200);

    const list = await call(browse, { path: "/api/listings" });
    expect(list.body.total).toBe(0);
    expect((await call(detail, { params: { id: listing.id } })).status).toBe(404);
    // Soft delete: row still exists for moderation history
    expect(await prisma.listing.findUnique({ where: { id: listing.id } })).not.toBeNull();
  });

  it("forbids deleting someone else's listing", async () => {
    const owner = await createUser();
    const other = await createUser();
    const listing = await createListing(owner.id);
    const cookie = await loginAs(other.email);
    const { status } = await call(remove, { method: "DELETE", cookie, params: { id: listing.id } });
    expect(status).toBe(403);
  });
});

describe("mark as sold", () => {
  it("marks an active listing sold; it stays visible without contact details", async () => {
    const seller = await createUser();
    const listing = await createListing(seller.id);
    const cookie = await loginAs(seller.email);

    const { status, body } = await call(markSold, { method: "POST", cookie, params: { id: listing.id } });
    expect(status).toBe(200);
    expect(body.listing.status).toBe("SOLD");

    const buyerView = await call(detail, { params: { id: listing.id } });
    expect(buyerView.body.listing.status).toBe("SOLD");
    expect(buyerView.body.listing.contact).toBeNull();
    expect(buyerView.body.listing.canContact).toBe(false);

    const list = await call(browse, { path: "/api/listings?status=SOLD" });
    expect(list.body.total).toBe(1);
  });

  it("cannot be marked sold twice, or by someone else", async () => {
    const seller = await createUser();
    const other = await createUser();
    const listing = await createListing(seller.id);

    const otherCookie = await loginAs(other.email);
    expect((await call(markSold, { method: "POST", cookie: otherCookie, params: { id: listing.id } })).status).toBe(403);

    const cookie = await loginAs(seller.email);
    expect((await call(markSold, { method: "POST", cookie, params: { id: listing.id } })).status).toBe(200);
    expect((await call(markSold, { method: "POST", cookie, params: { id: listing.id } })).status).toBe(409);
  });

  it("sold listings remain in the seller's history", async () => {
    const seller = await createUser();
    await createListing(seller.id, { status: "SOLD" });
    await createListing(seller.id);
    const cookie = await loginAs(seller.email);
    const { body } = await call(myListings, { cookie, path: "/api/users/me/listings" });
    expect(body.total).toBe(2);
  });
});

describe("seller profile", () => {
  it("shows public details and active listings only", async () => {
    const seller = await createUser({ name: "Muso Seller" });
    await createListing(seller.id, { title: "Active one" });
    await createListing(seller.id, { title: "Sold one", status: "SOLD" });

    const { status, body } = await call(sellerProfile, { params: { id: seller.id } });
    expect(status).toBe(200);
    expect(body.seller.name).toBe("Muso Seller");
    expect(body.seller.contact.email).toBe(seller.email);
    expect(body.seller).not.toHaveProperty("passwordHash");
    expect(body.activeListings.items.map((l: { title: string }) => l.title)).toEqual(["Active one"]);
    expect(body.seller.stats).toEqual({ activeListings: 1, soldListings: 1 });
  });

  it("hides deactivated sellers", async () => {
    const seller = await createUser({ isActive: false });
    expect((await call(sellerProfile, { params: { id: seller.id } })).status).toBe(404);
  });
});
