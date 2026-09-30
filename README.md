# Community Store Platform

A digital marketplace for a university and its surrounding community, where students, staff, vendors and local residents can buy and sell goods and services in one place.

---

## The problem

Buying and selling around campus happens through scattered social-media groups, notice boards and word of mouth. Listings get lost, there's no way to search, and there's no one keeping bad listings out.

## The solution

The Community Store is one central, searchable platform that connects buyers and sellers within the community. Sellers post what they're offering, buyers find it quickly, and administrators keep the marketplace safe. The deal itself happens directly between buyer and seller.

## Who it's for

- University students
- Faculty and staff
- Vendors
- Members of the surrounding community

---

## Features

**For everyone**
- Browse listings without an account
- Search by keyword and filter by one or more categories
- View listing details and seller profiles
- Contact sellers by email or phone

**For registered users**
- Create an account and manage a profile
- Post listings with a title, description, price, category and optional photo
- Edit or delete their own listings
- Mark items as sold (sold listings stay visible, clearly marked)
- Save listings to a wishlist
- Report suspicious or inappropriate listings

**For administrators**
- Dashboard with platform statistics
- Manage users, including deactivating accounts
- Review all listings and remove inappropriate ones, with a recorded reason
- Work through reported listings and take action

**Categories:** Textbooks · Electronics · Services · Clothing · Furniture · Other

---

## How it works

```text
Buyer:   Browse / Search  →  View listing  →  Contact seller  →  Arrange the deal directly
Seller:  Log in  →  Create listing  →  Manage it  →  Edit / Delete / Mark as sold
Safety:  User reports listing  →  Admin reviews  →  Admin takes action  →  Decision recorded
```

---

## Scope

The Community Store is a **listing platform**, not an online shop:

- No online payments, cart or checkout
- No delivery or logistics
- Buyers and sellers contact each other directly and complete transactions themselves

---

## Technology

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Next.js API routes (TypeScript) |
| Database | MySQL 8 with Prisma ORM |
| Testing | Vitest, Postman |

The application is responsive and designed to work on mobile phones as well as desktops.

---

## Getting started

```bash
npm install
cp .env.example .env        # then add your database settings
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Then open http://localhost:3000.

Full setup instructions are in **[docs/SETUP.md](docs/SETUP.md)**.

---

## Documentation

| Document | Contents |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Installation, database, testing and troubleshooting |
| [docs/API.md](docs/API.md) | API reference |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, database design and diagrams |

---

## Project structure

```text
app/          Pages and API routes
lib/          Business logic, validation and shared code
prisma/       Database schema and seed data
database/     MySQL setup script
docs/         Project documentation
tests/        Automated tests
postman/      API test collection
```