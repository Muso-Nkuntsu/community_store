# Developer Setup Guide

How to run, seed, test and work on the Community Store Platform locally.

---

## Requirements

- **Node.js 20.9 or newer** (`node -v`)
- **npm** (comes with Node)
- **MySQL 8** running locally (MySQL Installer on Windows, or Docker). XAMPP ships MariaDB, which mostly works but isn't what the schema was written for.
- Git / Git Bash (Windows)

Major package versions are pinned (`^15` Next.js, `^6` Prisma, `^3` Zod) on purpose: Next.js 16, Prisma 7 and Zod 4 have breaking changes. Don't run `npm audit fix --force`, which would upgrade them.

---

## Installation

```bash
git clone <repo-url> community-store
cd community-store
npm install
```

### Environment

```bash
cp .env.example .env
```

On Windows without Git Bash: `copy .env.example .env` (Command Prompt) or `Copy-Item .env.example .env` (PowerShell).

Edit `.env`:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/community_store`. URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `%` → `%25`). |
| `SESSION_SECRET` | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

`.env` is git-ignored. Never commit it.

---

## Database

### Option A: Prisma creates everything (recommended)

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

`migrate dev` needs permission to create a temporary "shadow" database (the MySQL `root` user has it). With a limited user, use `npx prisma db push` instead. Commit the generated `prisma/migrations/` folder.

### Option B: manual SQL

```bash
mysql -u root -p < database/schema.sql
npx prisma generate
npx prisma db seed
```

Don't run `prisma migrate dev` on a database created this way. Use one option per database.

Browse the data: `npm run db:studio`.

---

## Seed data

`npx prisma db seed` **empties the tables** and loads demo data: 1 admin, 5 users (one deactivated), 15 listings (some sold, one removed), reports and wishlist items.

Development-only accounts (fake, local only):

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@communitystore.test` | `Admin123!` |
| USER | `thandi@communitystore.test` | `Password123!` |
| USER | `sipho@communitystore.test` | `Password123!` |
| USER | `ayesha@communitystore.test` | `Password123!` |
| USER | `johan@communitystore.test` | `Password123!` |
| USER (deactivated) | `blocked@communitystore.test` | `Password123!` |

To promote a user to admin:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'someone@example.com';
```

---

## Running

```bash
npm run dev
```

Check http://localhost:3000/api/health; it should return `{"status":"ok","database":"up",...}`.

Production build: `npm run build`, then `npm start`.

---

## Testing

Integration tests run the real API routes against a separate MySQL test database.

```bash
cp .env.test.example .env.test     # set the MySQL password; DB name must end in _test
npm test
```

The test database is rebuilt on each run. Tests refuse to run against a database whose name doesn't end in `_test`.

| File | Covers |
|---|---|
| `tests/auth.test.ts` | Registration, duplicates, validation, login/logout, inactive users, 30-minute session expiry |
| `tests/listings.test.ts` | Create, browse, pagination, search, multi-category filter, edit/delete ownership, mark sold, seller profile |
| `tests/reports-admin.test.ts` | Reporting, admin access control, listing removal with reason, report resolution, user deactivation |
| `tests/wishlist-profile.test.ts` | Wishlist, profile edit, account deletion |

Other checks: `npm run typecheck`, `npm run lint`.

---

## Postman

Import `postman/community-store.postman_collection.json`, seed the database, start `npm run dev`, then run the requests in order (or use the Collection Runner).

Authentication uses a session cookie. After the Login request, Postman stores the cookie and sends it automatically; there are no tokens to copy. To switch user, run Logout and then Login again.

---

## Frontend integration

- Pages live in `app/` alongside `app/api/`. Replace the placeholder `app/layout.tsx` and `app/page.tsx`.
- Client Components: `fetch("/api/...")`. Cookies are sent automatically. Show `error.fields` under form inputs.
- Server Components: `getCurrentUser()` from `lib/current-user.ts` to protect pages.
- Use `displayImageUrl`, `categoryLabel`, `statusLabel` and `listing.viewer.*` from API responses.
- Full request/response reference: [API.md](API.md).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `P1001: Can't reach database server` | Start MySQL (Windows: Services → MySQL80 → Start). Check host/port. |
| `P1000: Authentication failed` | Wrong MySQL user/password in `.env`; URL-encode special characters. |
| `SESSION_SECRET is missing` | Set a 32+ character value in `.env` and restart. |
| `@prisma/client did not initialize yet` | Run `npx prisma generate`. |
| Migrate asks to reset the DB | The DB was created with `schema.sql`. Use a fresh DB or `npx prisma migrate reset` (deletes data). |
| Tests refuse to run | `.env.test` must exist and point to a `*_test` database. |
| `EPERM` / `EBUSY` on Windows | The project is inside OneDrive; move it to a non-synced folder such as `C:\dev`. |
