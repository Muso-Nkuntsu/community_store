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

// "2026-10-07T11:30:00.000Z" -> "7 Oct 2026"
export function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}
