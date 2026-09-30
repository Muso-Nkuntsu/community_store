# Community Store Platform

A university and community marketplace where students, staff, vendors and neighbours can list goods and services, find what they need, and contact the seller directly. It replaces scattered WhatsApp groups and word of mouth with one searchable place.

This repository is a single **Next.js** application. This part of the work covers the **backend and database**: the MySQL schema, Prisma models, authentication, business logic and REST API. The frontend team builds the pages in the same repo on top of these APIs (see [Working with the frontend](#working-with-the-frontend)).

> **Scope:** this is a listing platform, not a shop. There are **no online payments, no cart/checkout, and no delivery or logistics**. Buyers contact sellers by email or phone and complete the deal themselves.

---

## Features (backend)

**Accounts**
- Register with name, email, password and optional student ID (unique when given) and phone
- Login and logout with secure server-side sessions (HttpOnly cookie, 30-minute inactivity timeout)
- Deactivated users cannot log in
- View and edit profile, change password, delete account (password confirmation, safely anonymised)

**Listings**
- Create, edit and delete your own listings; ownership is enforced on the server
- Categories: Textbooks, Electronics, Services, Clothing, Furniture, Other
- Optional image: an http(s) URL or an uploaded JPEG/PNG/WebP (max 2 MB)
- Mark as sold. The listing stays visible with a SOLD status, and contact details are hidden.
- Public browse with pagination, newest first
- Database search over title and description, combined with **multi-category** filtering
- Listing detail with seller contact (email/phone) while the listing is active
- Public seller profiles

**Community & moderation**
- Report a listing (fraud, inappropriate, incorrect info, spam, other); duplicate open reports are blocked
- Wishlist (no duplicates; unavailable items are flagged, not lost)
- Admin dashboard stats: users, active users, listings, active, sold, pending reports
- Admin: view and search users, deactivate or reactivate them (who and why is recorded)
- Admin: view all listings and remove them with a **required reason** (admin, reason and time stored)
- Admin: report queue; review, dismiss, or take action and remove the listing in one step

---

## Technology stack

| | |
|---|---|
| Framework | Next.js 15 (App Router, Route Handlers), React 19 |
| Language | TypeScript (strict) |
| Database | MySQL 8 |
| ORM | Prisma 6 |
| Validation | Zod |
| Passwords | bcrypt (`bcryptjs`) |
| Tests | Vitest (integration tests against a real MySQL test database) |
| Styling | Tailwind CSS (added by the frontend team) |

Major versions are pinned (`^15`, `^6`, `^3`) on purpose: Next.js 16, Prisma 7 and Zod 4 have breaking changes.

---

## Requirements

- **Node.js 20.9 or newer** (`node -v`)
- **npm** (comes with Node)
- **MySQL 8** running locally (MySQL Installer on Windows, or Docker). XAMPP ships MariaDB, which mostly works but isn't what the schema was written for.
- Git / Git Bash (Windows)

---

## Installation

```bash
git clone <your-repo-url> community-store
cd community-store
npm install
```

### Environment setup

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows without Git Bash: `copy .env.example .env` (Command Prompt) or `Copy-Item .env.example .env` (PowerShell), or copy it in File Explorer and rename it `.env`.

Edit `.env`:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | `mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/community_store`. If the password contains `@`, `#` or `%`, URL-encode it (`@` → `%40`). |
| `SESSION_SECRET` | 32+ random characters. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

`.env` is git-ignored. Never commit real passwords or secrets.

---

## Database setup

### Option A: let Prisma create everything (recommended)

```bash
npx prisma generate                 # builds the typed database client
npx prisma migrate dev --name init  # creates the community_store DB and all tables
npx prisma db seed                  # demo data (see below)
```

`migrate dev` creates the database if it doesn't exist. It also needs permission to create a temporary "shadow" database, which the MySQL `root` user has. If you connect as a limited user, use `npx prisma db push` instead of `migrate dev`.

### Option B: create the database manually with SQL

For team members who prefer MySQL Workbench / phpMyAdmin, or to inspect the schema:

```bash
mysql -u root -p < database/schema.sql
npx prisma generate
npx prisma db seed
```

`database/schema.sql` contains `CREATE DATABASE IF NOT EXISTS community_store;` and every table, index and foreign key, matching `prisma/schema.prisma`. **Don't run `prisma migrate dev` on a database created this way**; Prisma would want to reset it. Stick to one option per database.

Useful MySQL commands:

```sql
-- in the mysql client (mysql -u root -p)
CREATE DATABASE IF NOT EXISTS community_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS community_store_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
USE community_store;
SHOW TABLES;
```

Browse the data in a GUI: `npm run db:studio`.

---

## Seed data

`npx prisma db seed` **empties the tables** and loads demo data: 1 admin, 5 users (one deactivated), 15 listings across every category (some SOLD, one REMOVED), reports in several states, and wishlist items.

**Development-only credentials. Never use these anywhere real:**

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@communitystore.test` | `Admin123!` |
| USER | `thandi@communitystore.test` | `Password123!` |
| USER | `sipho@communitystore.test` | `Password123!` |
| USER | `ayesha@communitystore.test` | `Password123!` |
| USER | `johan@communitystore.test` | `Password123!` |
| USER (deactivated, login is refused) | `blocked@communitystore.test` | `Password123!` |

---

## Running the project

```bash
npm run dev
```

Open http://localhost:3000/api/health; you should see `{"status":"ok","database":"up",...}`. Then try http://localhost:3000/api/listings.

Production build: `npm run build` then `npm start`.

---

## Testing

The tests are integration tests: they call the real route handlers against a **separate MySQL test database**, so they check validation, auth, ownership and SQL together.

```bash
cp .env.test.example .env.test     # edit the MySQL password; DB name must end in _test
npm test
```

On the first run, Vitest recreates `community_store_test` from the Prisma schema (it refuses to run against any database whose name doesn't end in `_test`, so your dev data is safe). Each test starts with empty tables.

| File | Covers |
|---|---|
| `tests/auth.test.ts` | Registration, duplicate email/student ID, validation, login, invalid login, inactive user rejected, logout, 30-minute inactivity expiry, hashed tokens, CSRF origin check |
| `tests/listings.test.ts` | Create, validation, browse, pagination, newest first, search, multi-category filter, detail, edit own, **reject editing another user's listing**, delete, mark sold, sold not contactable, seller profile |
| `tests/reports-admin.test.ts` | Reporting, duplicate reports, admin access control (401/403), admin stats, remove listing with required reason, resolve/dismiss reports, deactivate/reactivate users |
| `tests/wishlist-profile.test.ts` | Wishlist add/remove/duplicates/unavailable, profile view/edit, safe account deletion |

Other checks: `npm run typecheck`, `npm run lint`.

---

## API

The full contract with request and response examples is in **[docs/API.md](docs/API.md)**. Summary:

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session` |
| Profile | `GET/PATCH/DELETE /api/users/me`, `POST /api/users/me/password`, `GET /api/users/me/listings` |
| Sellers | `GET /api/users/:id` |
| Listings | `GET/POST /api/listings`, `GET/PATCH/DELETE /api/listings/:id`, `POST /api/listings/:id/sold` |
| Reports | `POST /api/listings/:id/reports`, `GET /api/reports` |
| Wishlist | `GET/POST /api/wishlist`, `DELETE /api/wishlist/:listingId` |
| Uploads | `POST /api/uploads`, `GET /api/uploads/:name` |
| Admin | `GET /api/admin/stats`, `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `GET /api/admin/listings`, `GET/DELETE /api/admin/listings/:id`, `GET /api/admin/reports`, `GET/PATCH /api/admin/reports/:id` |
| Health | `GET /api/health` |

Browse/search example: `GET /api/listings?q=java&categories=TEXTBOOKS,ELECTRONICS&page=1&limit=12`

### Postman

Import `postman/community-store.postman_collection.json`. Seed the database, start `npm run dev`, then run the requests **in order** (or use the Collection Runner). The steps are: register → login → session → create listing → browse → search → filter → get → update → mark sold → delete → wishlist add/remove → report → admin login → admin listings/users/reports → resolve report.

**How auth works in Postman:** the app uses an HttpOnly session cookie, not a bearer token. After the Login request Postman's cookie jar stores `cs_session` for `localhost` and sends it on every following request automatically, so there are no tokens to copy. To switch user, run Logout, then Login with other credentials. To see or clear the cookie, click **Cookies** under the Send button. Test scripts save IDs (`listingId`, `reportId`, ...) into collection variables for the next steps.

---

## Project structure

```text
community-store/
├── app/
│   ├── api/                    # REST API: route handlers ("controllers")
│   │   ├── auth/               #   register, login, logout, session
│   │   ├── users/              #   me (profile), me/listings, me/password, [id] seller profile
│   │   ├── listings/           #   browse/create, [id] detail/edit/delete, [id]/sold, [id]/reports
│   │   ├── wishlist/           #   list/add, [listingId] remove
│   │   ├── reports/            #   my reports
│   │   ├── uploads/            #   image upload + serving
│   │   ├── admin/              #   stats, users, listings, reports (ADMIN only)
│   │   └── health/             #   uptime / DB check
│   ├── layout.tsx, page.tsx    # placeholders; replaced by the frontend team
├── lib/
│   ├── services/               # business logic ("services")
│   │   ├── listing-service.ts
│   │   ├── user-service.ts
│   │   ├── wishlist-service.ts
│   │   ├── report-service.ts
│   │   ├── admin-service.ts
│   │   └── upload-service.ts
│   ├── api.ts                  # route wrapper, error handling, CSRF origin check
│   ├── auth.ts                 # bcrypt, requireUser, requireAdmin
│   ├── session.ts              # session create/verify/expire, cookies
│   ├── current-user.ts         # getCurrentUser() for Server Components
│   ├── validations.ts          # all Zod schemas
│   ├── serializers.ts          # DTOs: which fields leave the server
│   ├── constants.ts            # categories, labels, limits, timeouts
│   └── prisma.ts               # shared Prisma client
├── prisma/
│   ├── schema.prisma           # models ("entities")
│   └── seed.ts
├── database/schema.sql         # manual MySQL 8 setup
├── docs/
│   ├── API.md                  # API contract for the frontend
│   └── ARCHITECTURE.md         # design, ERD, diagrams, security, NFRs
├── postman/                    # Postman collection
├── tests/                      # Vitest integration tests
├── storage/uploads/            # uploaded images (git-ignored)
├── public/placeholder-listing.svg
├── .env.example, .env.test.example, .gitignore
└── package.json, tsconfig.json, next.config.ts, vitest.config.ts, eslint.config.mjs
```

---

## User roles

| | USER | ADMIN |
|---|---|---|
| Browse, search, view listings and sellers | ✓ | ✓ |
| Create / edit / delete / mark sold **own** listings | ✓ | ✓ |
| Report listings, wishlist, manage profile | ✓ | ✓ |
| Admin dashboard, view all users and listings | | ✓ |
| Deactivate / reactivate users | | ✓ (not themselves, not the last admin) |
| Remove any listing (reason required) | | ✓ |
| Review and resolve reports | | ✓ |

Visitors who aren't logged in can browse, search, view listings and view seller profiles.

To make an existing user an admin (there is deliberately no API for promoting users):

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'someone@example.com';
```

---

## Working with the frontend

- Pages live in `app/` next to `app/api/`. Replace `app/layout.tsx` and `app/page.tsx`.
- In **Client Components**, call the API with `fetch("/api/...")`. Cookies are sent automatically. Show `error.fields` under form inputs.
- In **Server Components**, call `getCurrentUser()` from `lib/current-user.ts` to protect pages (redirect to `/login`, or to `/` for non-admins on `/admin`). You can also import services directly (e.g. `searchListings`) to render lists server-side without an extra HTTP hop.
- Use `displayImageUrl` for images, `categoryLabel`/`statusLabel` for text, and `listing.viewer.*` to decide which buttons to show.
- Shared constants (categories, report reasons, labels) are in `lib/constants.ts`.

---

## Scope limitations

- **No online payments**, cart, checkout, escrow or in-app financial transactions.
- **No delivery, shipping or logistics.**
- **Seller contact is external**: email (`mailto:`) and phone (`tel:`) links; there is no in-app chat.
- Reviews/ratings and notifications are not part of the specification.
- Uploaded images are stored on the server's local disk (`storage/uploads`). A hosted deployment without a persistent disk should switch to a cloud bucket (only `lib/services/upload-service.ts` changes).
- The 99% uptime target applies to the deployed system and can't be demonstrated locally; `/api/health` exists for monitoring it.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `P1001: Can't reach database server` | Start MySQL (Windows: Services → MySQL80 → Start). Check host/port in `DATABASE_URL`. |
| `P1000: Authentication failed` | Wrong MySQL user/password in `.env`; URL-encode special characters. |
| `SESSION_SECRET is missing` | Set a 32+ character value in `.env` and restart `npm run dev`. |
| `@prisma/client did not initialize yet` | Run `npx prisma generate`. |
| Migrate asks to reset the DB | The DB was created with `schema.sql`. Use a fresh DB, or `npx prisma migrate reset` (deletes data). |
| Tests refuse to run | `.env.test` must exist and its DB name must end in `_test`. |
