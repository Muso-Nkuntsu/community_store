// Shared values that must match the backend's lib/constants.ts.
// Each entry is [value sent to the API, label shown to the user].

export const CATEGORIES = [
  ["TEXTBOOKS", "Textbooks"],
  ["ELECTRONICS", "Electronics"],
  ["SERVICES", "Services"],
  ["CLOTHING", "Clothing"],
  ["FURNITURE", "Furniture"],
  ["OTHER", "Other"],
];

export const REASONS = [
  ["FRAUD", "Fraud / suspicious listing"],
  ["INAPPROPRIATE", "Inappropriate content"],
  ["INCORRECT_INFO", "Incorrect information"],
  ["SPAM", "Spam"],
  ["OTHER", "Other"],
];

export const LISTING_STATUS = { ACTIVE: "Available", SOLD: "Sold", REMOVED: "Removed" };
export const ROLES = { USER: "Member", ADMIN: "Admin" };

// Upload limits, checked in the browser for instant feedback (the backend checks again)
export const UPLOAD = { maxBytes: 2 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"] };

const lookup = (pairs, value) => (pairs.find(([v]) => v === value) || [])[1] || "";
export const categoryLabel = (value) => lookup(CATEGORIES, value);

// "2026-10-07T11:30:00.000Z" -> "7 Oct 2026"
export function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

// 150 -> "R150", "1250.5" -> "R1 250.50". The API may send the price as a number or a decimal string.
// Formatted by hand because browsers disagree on the en-ZA locale format.
export function fmtPrice(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return "";
  const [whole, cents] = Math.abs(n).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " "); // non-breaking space between thousands
  return (n < 0 ? "-R" : "R") + grouped + (cents === "00" ? "" : "." + cents);
}
