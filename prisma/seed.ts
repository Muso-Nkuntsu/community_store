/**
 * Development seed data. Run with:  npx prisma db seed
 *
 * WARNING: this empties every table first. Development only.
 * All passwords below are demo passwords - never reuse them anywhere real.
 */
import { PrismaClient, type Category, type Listing } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";
const ADMIN_PASSWORD = "Admin123!";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const daysAgo = (d: number) => minutesAgo(d * 24 * 60);

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a production database.");
  }

  console.log("Clearing existing data...");
  await prisma.session.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.report.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.updateMany({ data: { deactivatedById: null } });
  await prisma.user.deleteMany();

  const userHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  console.log("Creating users...");
  const admin = await prisma.user.create({
    data: {
      name: "Store Admin",
      email: "admin@communitystore.test",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "0210000000",
      createdAt: daysAgo(120),
    },
  });

  const thandi = await prisma.user.create({
    data: {
      name: "Thandi Mokoena",
      email: "thandi@communitystore.test",
      studentId: "3900001",
      phone: "0821234567",
      passwordHash: userHash,
      createdAt: daysAgo(90),
    },
  });
  const sipho = await prisma.user.create({
    data: {
      name: "Sipho Ndlovu",
      email: "sipho@communitystore.test",
      studentId: "3900002",
      passwordHash: userHash,
      createdAt: daysAgo(60),
    },
  });
  const ayesha = await prisma.user.create({
    data: {
      name: "Ayesha Petersen",
      email: "ayesha@communitystore.test",
      phone: "0739876543",
      passwordHash: userHash,
      createdAt: daysAgo(45),
    },
  });
  const johan = await prisma.user.create({
    data: {
      name: "Johan van Wyk",
      email: "johan@communitystore.test",
      studentId: "3900004",
      passwordHash: userHash,
      createdAt: daysAgo(30),
    },
  });
  const blocked = await prisma.user.create({
    data: {
      name: "Blocked Seller",
      email: "blocked@communitystore.test",
      passwordHash: userHash,
      isActive: false,
      deactivatedAt: daysAgo(2),
      deactivatedById: admin.id,
      deactivationReason: "Repeated spam listings (demo data).",
      createdAt: daysAgo(20),
    },
  });

  console.log("Creating listings...");
  type Seed = {
    seller: string;
    title: string;
    description: string;
    price: string;
    category: Category;
    daysOld: number;
    status?: "ACTIVE" | "SOLD" | "REMOVED";
    imageUrl?: string;
  };

  const seeds: Seed[] = [
    { seller: thandi.id, title: "Java: How to Program (11th ed.)", description: "Deitel textbook for first-year programming. Some highlighting, otherwise good condition.", price: "250.00", category: "TEXTBOOKS", daysOld: 1 },
    { seller: thandi.id, title: "Scientific calculator Casio fx-991ZA", description: "Works perfectly, allowed in exams. Comes with cover.", price: "180.00", category: "ELECTRONICS", daysOld: 3 },
    { seller: thandi.id, title: "Economics 101 study notes", description: "Typed and printed notes covering the full semester, bound.", price: "60.00", category: "TEXTBOOKS", daysOld: 40, status: "SOLD" },
    { seller: sipho.id, title: "Maths tutoring (first-year calculus)", description: "Final-year BSc student offering calculus tutoring. R150 per hour, on campus.", price: "150.00", category: "SERVICES", daysOld: 2 },
    { seller: sipho.id, title: "Laptop stand, adjustable aluminium", description: "Folding laptop stand, fits up to 15.6 inch. Barely used.", price: "220.00", category: "ELECTRONICS", daysOld: 5 },
    { seller: sipho.id, title: "Introduction to Algorithms (CLRS) 3rd ed.", description: "Hardcover, good condition. Useful for data structures and algorithms modules.", price: "450.00", category: "TEXTBOOKS", daysOld: 12, status: "SOLD" },
    { seller: ayesha.id, title: "Single bed frame with mattress", description: "Pine bed frame and mattress, ideal for residence or digs. Collection in Bellville.", price: "900.00", category: "FURNITURE", daysOld: 4 },
    { seller: ayesha.id, title: "Study desk and chair", description: "Compact desk with drawer plus matching chair.", price: "650.00", category: "FURNITURE", daysOld: 8 },
    { seller: ayesha.id, title: "Winter jacket, size M", description: "Warm waterproof jacket, worn one season.", price: "300.00", category: "CLOTHING", daysOld: 10 },
    { seller: ayesha.id, title: "Graduation gown hire", description: "Black gown available to hire for graduation week.", price: "120.00", category: "CLOTHING", daysOld: 25, status: "SOLD" },
    { seller: johan.id, title: "Wireless mouse and keyboard set", description: "Logitech combo, batteries included.", price: "275.50", category: "ELECTRONICS", daysOld: 6 },
    { seller: johan.id, title: "CV and cover-letter editing", description: "I will proofread and format your CV for internship applications.", price: "80.00", category: "SERVICES", daysOld: 7 },
    { seller: johan.id, title: "Bicycle helmet", description: "Size L, good condition.", price: "150.00", category: "OTHER", daysOld: 15 },
    { seller: johan.id, title: "Cheap phones!!! Click my link", description: "Too-good-to-be-true phone deals. Pay upfront to an unknown account.", price: "99.00", category: "ELECTRONICS", daysOld: 9, status: "REMOVED" },
    { seller: blocked.id, title: "Spam listing from deactivated user", description: "This listing is hidden because its seller is deactivated.", price: "10.00", category: "OTHER", daysOld: 3 },
  ];

  const listings: Listing[] = [];
  for (const s of seeds) {
    const created = daysAgo(s.daysOld);
    const status = s.status ?? "ACTIVE";
    listings.push(
      await prisma.listing.create({
        data: {
          title: s.title,
          description: s.description,
          price: s.price,
          category: s.category,
          imageUrl: s.imageUrl ?? null,
          status,
          sellerId: s.seller,
          createdAt: created,
          soldAt: status === "SOLD" ? daysAgo(Math.max(0, s.daysOld - 2)) : null,
          removedAt: status === "REMOVED" ? daysAgo(1) : null,
          removedById: status === "REMOVED" ? admin.id : null,
          removalReason: status === "REMOVED" ? "Suspected scam: asks buyers to pay upfront to an unknown account." : null,
        },
      }),
    );
  }
  const byTitle = (t: string) => listings.find((l) => l.title.startsWith(t))!;

  console.log("Creating reports...");
  await prisma.report.create({
    data: {
      listingId: byTitle("Bicycle helmet").id,
      reporterId: thandi.id,
      reason: "INCORRECT_INFO",
      details: "Photo shows a size S helmet, not L.",
      createdAt: daysAgo(1),
    },
  });
  await prisma.report.create({
    data: {
      listingId: byTitle("Laptop stand").id,
      reporterId: ayesha.id,
      reason: "SPAM",
      createdAt: minutesAgo(90),
    },
  });
  await prisma.report.create({
    data: {
      listingId: byTitle("Cheap phones").id,
      reporterId: sipho.id,
      reason: "FRAUD",
      details: "Seller asked me to pay into a personal account before viewing.",
      status: "ACTION_TAKEN",
      resolvedAt: daysAgo(1),
      resolvedById: admin.id,
      resolutionNote: "Listing removed: suspected scam.",
      createdAt: daysAgo(2),
    },
  });
  await prisma.report.create({
    data: {
      listingId: byTitle("Winter jacket").id,
      reporterId: johan.id,
      reason: "OTHER",
      details: "Thought the price was too high.",
      status: "DISMISSED",
      resolvedAt: daysAgo(3),
      resolvedById: admin.id,
      resolutionNote: "Pricing is up to the seller.",
      createdAt: daysAgo(5),
    },
  });

  console.log("Creating wishlist items...");
  await prisma.wishlistItem.createMany({
    data: [
      { userId: thandi.id, listingId: byTitle("Single bed frame").id },
      { userId: thandi.id, listingId: byTitle("Maths tutoring").id },
      { userId: sipho.id, listingId: byTitle("Java: How to Program").id },
      { userId: johan.id, listingId: byTitle("Study desk").id },
      // Saved before it sold - shows how the wishlist handles unavailable items.
      { userId: johan.id, listingId: byTitle("Introduction to Algorithms").id },
    ],
  });

  console.log("\nSeed complete. Development-only logins:");
  console.log(`  ADMIN  admin@communitystore.test  / ${ADMIN_PASSWORD}`);
  console.log(`  USER   thandi@communitystore.test / ${DEMO_PASSWORD}`);
  console.log(`  USER   sipho@communitystore.test  / ${DEMO_PASSWORD}`);
  console.log(`  USER   ayesha@communitystore.test / ${DEMO_PASSWORD}`);
  console.log(`  USER   johan@communitystore.test  / ${DEMO_PASSWORD}`);
  console.log(`  (deactivated) blocked@communitystore.test / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
