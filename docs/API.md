# Community Store API Reference

Base URL (local): `http://localhost:3000`

Owner: Backend (Musoyenkosi). This document is the contract between the backend and the frontend. If a response shape needs to change, update this file in the same pull request.

---

## Conventions

### Authentication
- Log in with `POST /api/auth/login`. The server sets an **HttpOnly cookie** called `cs_session`.
- Browsers send the cookie automatically on same-origin requests (`fetch("/api/...")` with the default `credentials: "same-origin"`). The frontend never reads or stores the token and never uses `localStorage` for auth.
- A session ends after **30 minutes of inactivity** (any authenticated request counts as activity), after 12 hours in total, on logout, or when an admin deactivates the user.
- Server Components can get the user without an HTTP call:
  ```ts
  import { getCurrentUser } from "@/lib/current-user";
  const user = await getCurrentUser(); // null if not logged in
  ```

### Access levels
| Label | Meaning |
|---|---|
| Public | No login needed |
| User | Any logged-in, active user (401 otherwise) |
| Owner | Logged in **and** owns the resource (403 otherwise), checked on the server |
| Admin | Logged in with role `ADMIN` (403 otherwise) |

### Requests
- Bodies are JSON with `Content-Type: application/json` (except image upload, which is `multipart/form-data`).
- Unknown fields in a body are rejected with 400, so clients cannot set things like `sellerId` or `status` directly.
- IDs are cuid strings, e.g. `cm1x2y3z4a5b6c7d8e9f0g1h`.

### Money
Prices are sent as a number or string (`250`, `"250.5"`, `"R250"`) and always **returned as a string with two decimals**: `"250.00"`. Display it as `R${price}`. Never do arithmetic on prices as floats.

### Pagination
List endpoints take `?page=1&limit=12` (limit max 50) and return:
```json
{ "items": [], "page": 1, "limit": 12, "total": 100, "totalPages": 9 }
```

### Errors
Every error has the same shape. Stack traces and database errors are never returned.
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid.",
    "fields": { "email": ["Enter a valid email address."] }
  }
}
```
| Status | code | When |
|---|---|---|
| 400 | `BAD_REQUEST` / `VALIDATION_ERROR` | Invalid input (`fields` holds per-field messages for forms) |
| 401 | `UNAUTHORIZED` | Not logged in, or session expired |
| 403 | `FORBIDDEN` | Logged in but not allowed (not owner / not admin / deactivated) |
| 404 | `NOT_FOUND` | Doesn't exist or isn't visible to you |
| 409 | `CONFLICT` | Duplicate or invalid state (email taken, already sold, already in wishlist, already reported) |
| 413 / 415 | `PAYLOAD_TOO_LARGE` / `UNSUPPORTED_MEDIA_TYPE` | Upload too big / wrong type |
| 500 | `INTERNAL_ERROR` | Unexpected server error (generic message only) |

### Enum values
| Enum | Values (display label) |
|---|---|
| Category | `TEXTBOOKS` (Textbooks), `ELECTRONICS` (Electronics), `SERVICES` (Services), `CLOTHING` (Clothing), `FURNITURE` (Furniture), `OTHER` (Other) |
| Listing status | `ACTIVE` (Available), `SOLD` (Sold), `REMOVED` (Removed by admin) |
| Report reason | `FRAUD` (Fraud / suspicious listing), `INAPPROPRIATE` (Inappropriate content), `INCORRECT_INFO` (Incorrect information), `SPAM` (Spam), `OTHER` (Other) |
| Report status | `PENDING`, `REVIEWED`, `DISMISSED`, `ACTION_TAKEN` |

Responses include ready-made labels (`categoryLabel`, `statusLabel`, `reasonLabel`), so the frontend doesn't need its own mapping. The same labels are exported from `lib/constants.ts`.

---

## Endpoint summary

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness + DB check |
| POST | `/api/auth/register` | Public | Create account (logs in) |
| POST | `/api/auth/login` | Public | Log in |
| POST | `/api/auth/logout` | Public | Log out |
| GET | `/api/auth/session` | Public | Who am I? (never 401) |
| GET | `/api/users/me` | User | Profile + dashboard stats |
| PATCH | `/api/users/me` | User | Edit profile |
| DELETE | `/api/users/me` | User | Delete account |
| POST | `/api/users/me/password` | User | Change password |
| GET | `/api/users/me/listings` | User | My Listings (incl. sold/removed) |
| GET | `/api/users/:id` | Public | Seller profile |
| GET | `/api/listings` | Public | Browse / search / filter |
| POST | `/api/listings` | User | Create listing |
| GET | `/api/listings/:id` | Public | Listing detail |
| PATCH | `/api/listings/:id` | Owner | Edit listing |
| DELETE | `/api/listings/:id` | Owner | Delete listing |
| POST | `/api/listings/:id/sold` | Owner | Mark as sold |
| POST | `/api/listings/:id/reports` | User | Report listing |
| GET | `/api/reports` | User | My submitted reports |
| GET | `/api/wishlist` | User | My wishlist |
| POST | `/api/wishlist` | User | Add to wishlist |
| DELETE | `/api/wishlist/:listingId` | User | Remove from wishlist |
| POST | `/api/uploads` | User | Upload listing image |
| GET | `/api/uploads/:name` | Public | Serve uploaded image |
| GET | `/api/admin/stats` | Admin | Dashboard counts |
| GET | `/api/admin/users` | Admin | All users |
| PATCH | `/api/admin/users/:id` | Admin | Deactivate / reactivate |
| GET | `/api/admin/listings` | Admin | All listings |
| GET | `/api/admin/listings/:id` | Admin | Listing + its reports |
| DELETE | `/api/admin/listings/:id` | Admin | Remove listing (reason required) |
| GET | `/api/admin/reports` | Admin | Report queue |
| GET | `/api/admin/reports/:id` | Admin | Report detail |
| PATCH | `/api/admin/reports/:id` | Admin | Review / dismiss / take action |

> Changes from the original suggested routes: `GET /api/reports` returns the caller's **own** reports. Admin report handling lives only under `/api/admin/reports`, so there is no second `PATCH /api/reports/:id`. `/api/users/me/listings`, `/api/users/me/password`, `/api/admin/stats`, `/api/uploads` and `/api/health` were added.

---

## Auth

### POST /api/auth/register
```json
{
  "name": "Nomsa Dlamini",
  "email": "nomsa@example.com",
  "studentId": "3811111",
  "phone": "0821234567",
  "password": "SuperSecret1",
  "confirmPassword": "SuperSecret1"
}
```
`studentId` and `phone` are optional. Email is lower-cased. Password 8-72 characters.

**201**: sets the session cookie (the user is logged in).
```json
{ "user": { "id": "...", "name": "Nomsa Dlamini", "email": "nomsa@example.com", "studentId": "3811111", "phone": "0821234567", "role": "USER", "isActive": true, "createdAt": "...", "updatedAt": "..." }, "message": "Account created." }
```
**400** field errors · **409** email or student ID already registered (`fields.email` / `fields.studentId`).

### POST /api/auth/login
`{ "email": "...", "password": "..." }` → **200** `{ "user": {...} }` + cookie.
**401** "Invalid email or password." (same message whether or not the email exists) · **403** account deactivated.

### POST /api/auth/logout
No body. Always **200** `{ "message": "Logged out." }` and clears the cookie.

### GET /api/auth/session
**200** `{ "authenticated": true, "user": { "id", "name", "email", "role" }, "idleTimeoutMinutes": 30 }`
or `{ "authenticated": false, "user": null, ... }`. Use it for the navbar (show the Admin link when `user.role === "ADMIN"`).

---

## Profile

### GET /api/users/me
Everything the user dashboard needs:
```json
{
  "user": { "id", "name", "email", "studentId", "phone", "role", "isActive", "createdAt", "updatedAt" },
  "stats": { "activeListings": 2, "soldListings": 1, "wishlistCount": 3 },
  "recentListings": [ /* ListingCard x5 */ ]
}
```

### PATCH /api/users/me
Any of `name`, `email`, `studentId`, `phone`. Omit a field to leave it unchanged, or send `null` to clear `studentId`/`phone`. → `{ "user", "message" }`. **409** if the email or student ID is taken.

### POST /api/users/me/password
`{ "currentPassword", "newPassword", "confirmPassword" }` → 200. Other devices are logged out.

### DELETE /api/users/me
`{ "password": "..." }` → 200, cookie cleared. The account is anonymised (name/email/phone wiped), the user's listings disappear, and the reports they filed are kept for moderation history. **400** wrong password · **409** the user is the only admin.

### GET /api/users/me/listings?status=ACTIVE|SOLD|REMOVED&page=&limit=
Paginated ListingCards for the My Listings page, including sold ones (history) and admin-removed ones, each with `removalReason` and `soldAt` added.

### GET /api/users/:id (seller profile, public)
```json
{
  "seller": {
    "id": "...", "name": "Thandi Mokoena", "memberSince": "2026-07-01T...",
    "contact": { "email": "...", "phone": "...", "mailto": "mailto:...", "tel": "tel:..." },
    "stats": { "activeListings": 2, "soldListings": 1 }
  },
  "activeListings": { "items": [ /* ListingCard */ ], "page": 1, "limit": 12, "total": 2, "totalPages": 1 }
}
```
For more pages use `GET /api/listings?sellerId=<id>&status=ACTIVE&page=2`. **404** if the seller doesn't exist or is deactivated.

---

## Listings

### ListingCard (used in every grid)
```json
{
  "id": "...",
  "title": "Java: How to Program",
  "price": "250.00",
  "category": "TEXTBOOKS",
  "categoryLabel": "Textbooks",
  "imageUrl": null,
  "displayImageUrl": "/placeholder-listing.svg",
  "status": "ACTIVE",
  "statusLabel": "Available",
  "isAvailable": true,
  "seller": { "id": "...", "name": "Thandi Mokoena" },
  "createdAt": "2026-09-29T10:00:00.000Z"
}
```
Use `displayImageUrl` for the `<img src>`; it falls back to the placeholder when there is no image. Show a SOLD badge when `status === "SOLD"`.

### GET /api/listings (public)
| Param | Example | Notes |
|---|---|---|
| `q` | `java` | Searches title and description (case-insensitive) |
| `categories` | `TEXTBOOKS,ELECTRONICS` | Multi-select; combined with `q` |
| `category` | `TEXTBOOKS` | Single-category shortcut |
| `status` | `ACTIVE` or `SOLD` | Default: both |
| `sellerId` | `...` | One seller's listings |
| `page`, `limit` | `1`, `12` | limit ≤ 50 |

Always newest first. "Clear filters" = call it with no params. An empty result is **200** with `items: []` and `total: 0` (show "No listings found").

Search-as-you-type: debounce input by about 300 ms and call this endpoint (or update the URL's `searchParams` so a Server Component re-renders). No full page reload is needed.

### POST /api/listings (user)
```json
{ "title": "Study desk", "description": "Compact desk with drawer.", "price": "650", "category": "FURNITURE", "imageUrl": null }
```
title 3-120 chars · description 10-5000 · price > 0, at most 2 decimals · `imageUrl` optional (http/https URL or a `/api/uploads/...` path from the upload endpoint).
**201** `{ "listing": ListingDetail, "message": "Your listing is live." }`. It is immediately visible in browse.

### GET /api/listings/:id (public)
ListingDetail = ListingCard plus:
```json
{
  "description": "...",
  "updatedAt": "...",
  "soldAt": null,
  "seller": { "id": "...", "name": "...", "memberSince": "..." },
  "contact": { "email": "...", "phone": "...", "mailto": "mailto:...?subject=...", "tel": "tel:..." },
  "canContact": true,
  "viewer": {
    "isOwner": false, "canEdit": false, "canMarkSold": false, "canDelete": false,
    "canReport": true, "canWishlist": true, "inWishlist": false
  },
  "moderation": null
}
```
- `contact` is `null` when the listing is SOLD, so a sold listing cannot be contacted. Point the **Contact Seller** button at `contact.mailto` (and `contact.tel` if present). Disable it when `canContact` is false.
- `viewer.*` tells the page which buttons to show. The server still enforces every rule regardless.
- `moderation` (`removedAt`, `removalReason`) is only present for the owner/admin of a REMOVED listing.
- **404** if it doesn't exist, was deleted, was removed by an admin (unless you are the owner or an admin), or the seller is deactivated.

### PATCH /api/listings/:id (owner)
Any subset of the create fields. `imageUrl: null` removes the image. **403** not the owner · **409** listing was removed by an admin.

### DELETE /api/listings/:id (owner)
**200**. The listing disappears everywhere. Show a confirmation dialog first. (Internally it's a soft delete, so moderation history survives.)

### POST /api/listings/:id/sold (owner)
**200** `{ "listing": ListingDetail, "message" }`. **409** if already sold or not active.

---

## Reports

### POST /api/listings/:id/reports (user)
`{ "reason": "FRAUD", "details": "optional, required when reason is OTHER" }`
**201** `{ "message": "Your report has been received.", "report": { "id", "reason", "reasonLabel", "status", "statusLabel", "listing": { "id", "title" }, "createdAt", "resolvedAt" } }`
**400** own listing / missing reason · **404** listing gone · **409** you already have an open report on this listing.

### GET /api/reports (user)
`{ "items": [ /* the same report shape */ ] }`: the reports you have filed and their status.

---

## Wishlist

### GET /api/wishlist
```json
{
  "items": [
    { "id": "...", "addedAt": "...", "isAvailable": true, "unavailableReason": null, "listing": { /* ListingCard */ } },
    { "id": "...", "addedAt": "...", "isAvailable": false, "unavailableReason": "REMOVED", "listing": { "id": "...", "title": "..." } }
  ]
}
```
`unavailableReason` is `SOLD`, `REMOVED`, `DELETED` or `null`. For REMOVED/DELETED only the id and title are returned. Show these greyed out with a Remove button.

### POST /api/wishlist
`{ "listingId": "..." }` → **201**. **400** own listing · **404** not found/removed · **409** already saved, or the listing isn't available (sold).

### DELETE /api/wishlist/:listingId
**200**, or **404** if it wasn't in the wishlist.

---

## Image upload (optional)

### POST /api/uploads (user)
`multipart/form-data` with one field `file`. JPEG, PNG or WebP only (checked by file content), max 2 MB.
**201** `{ "url": "/api/uploads/3f9c...e1.jpg", "bytes": 123456, "type": "image/jpeg" }`. Send `url` as the listing's `imageUrl`.
```ts
const fd = new FormData();
fd.append("file", fileInput.files[0]);
const res = await fetch("/api/uploads", { method: "POST", body: fd });
```

---

## Admin

All routes: **401** when logged out, **403** for non-admins.

### GET /api/admin/stats
`{ "stats": { "users", "activeUsers", "listings", "activeListings", "soldListings", "removedListings", "pendingReports" } }`

### GET /api/admin/users?q=&status=active|inactive&role=USER|ADMIN&page=&limit=
Paginated. Each user: profile fields plus `deactivatedAt`, `deactivationReason`, `deactivatedBy { id, name }`, `listingCount`, `reportsFiled`. `q` searches name, email and student ID.

### PATCH /api/admin/users/:id
`{ "isActive": false, "reason": "Spam listings" }` to deactivate (logs them out, hides their listings, records which admin did it). `{ "isActive": true }` to reactivate.
**400** targeting yourself · **409** already in that state, or it would deactivate the last admin.

### GET /api/admin/listings?q=&status=ACTIVE|SOLD|REMOVED&includeDeleted=true&page=&limit=
Paginated admin listings: full detail plus `seller { id, name, email, isActive }`, `removedBy`, `removalReason`, `removedAt`, `isDeletedBySeller`, `reportCount`. `q` also matches the seller's name/email.

### GET /api/admin/listings/:id
`{ "listing": AdminListing, "reports": [ AdminReport ] }`

### DELETE /api/admin/listings/:id
`{ "reason": "Scam - asks for payment upfront" }` (5-500 chars, **required**). The listing becomes `REMOVED`, and `removedById`, `removalReason` and `removedAt` are stored. Any open reports on it are closed as `ACTION_TAKEN`. **409** if already removed.

### GET /api/admin/reports?status=PENDING|REVIEWED|DISMISSED|ACTION_TAKEN|OPEN&page=&limit=
`OPEN` = PENDING + REVIEWED. PENDING/OPEN are sorted oldest first (a queue); other statuses newest first.
AdminReport:
```json
{
  "id": "...", "reason": "FRAUD", "reasonLabel": "Fraud / suspicious listing", "details": "...",
  "status": "PENDING", "statusLabel": "Pending", "resolutionNote": null, "resolvedAt": null, "resolvedBy": null,
  "listing": { "id", "title", "status", "isDeletedBySeller", "sellerId" },
  "reporter": { "id", "name", "email" },
  "createdAt": "...", "updatedAt": "..."
}
```

### GET /api/admin/reports/:id
`{ "report": AdminReport, "otherReportsOnListing": 2 }`

### PATCH /api/admin/reports/:id
```json
{ "status": "ACTION_TAKEN", "resolutionNote": "Confirmed scam", "removeListing": true, "removalReason": "Scam listing" }
```
- `REVIEWED`: in progress, still open.
- `DISMISSED`: closed, no action.
- `ACTION_TAKEN`: closed. With `removeListing: true` (requires `removalReason`) the listing is removed in the same step.

**409** if the report is already closed.
