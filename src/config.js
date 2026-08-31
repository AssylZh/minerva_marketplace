/** Backend origin (no /api). Used for uploads and can be overridden in production. */
export const API_ORIGIN =
  process.env.REACT_APP_API_ORIGIN || "http://127.0.0.1:5001";

export const API_BASE = `${API_ORIGIN}/api`;
export default API_BASE;

const PLACEHOLDER =
  "https://placehold.co/300x200?text=No+Image";

/** Resolve stored path (e.g. `/uploads/abc.jpg`) or absolute URL for <img src>. */
export function itemImageSrc(imageUrl) {
  if (!imageUrl) return PLACEHOLDER;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
    return imageUrl;
  const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${API_ORIGIN}${path}`;
}

/** Format integer cents into marketplace display price. */
export function formatPriceCents(priceCents) {
  const cents = Number(priceCents) || 0;
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}
