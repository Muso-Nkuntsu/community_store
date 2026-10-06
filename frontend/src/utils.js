export const R = (n) => "R" + n.toLocaleString("en-ZA");
export const today = () => new Date().toLocaleDateString("en-GB");
export const stars = (n) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
export const tone = (i) => ["#0A1F44", "#153A7A", "#1F4E9E", "#0F2C5E"][i % 4];
