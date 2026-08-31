/** Displays a single item as a clickable card with image, price, condition, and location. */
import { Link } from "react-router-dom";
import { formatPriceCents, itemImageSrc } from "../config";

const CONDITION_COLORS = {
  "New": "var(--success)",
  "Like New": "var(--info)",
  "Good": "#f39c12",
  "Fair": "var(--text-muted)",
};

function timeAgo(dateString) {
  const now = new Date();
  const iso = dateString.endsWith("Z") ? dateString : dateString + "Z";
  const date = new Date(iso);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ItemCard({ item, currentUserId }) {
  const price = formatPriceCents(item.price);
  const conditionColor = CONDITION_COLORS[item.condition] || "var(--text-muted)";
  const isSold = item.status === "sold";
  const isOwn = currentUserId && item.seller_id === currentUserId;

  return (
    <Link to={`/items/${item.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div className="card item-card">
        {isSold && <span className="badge badge-sold">Sold</span>}
        {isOwn && !isSold && <span className="badge badge-own">Your listing</span>}
        <img src={itemImageSrc(item.image_url)} alt={item.title} />
        <h3>{item.title}</h3>
        <div className="item-card-meta">
          <span className="item-card-price">{price}</span>
          <span className="item-card-condition" style={{ color: conditionColor, background: conditionColor + "18" }}>
            {item.condition}
          </span>
        </div>
        <div className="item-card-meta">
          <p className="item-card-location">{item.location || "Unknown location"}</p>
          <span className="item-card-time">{timeAgo(item.created_at)}</span>
        </div>
        {item.category && <p className="item-card-category">{item.category}</p>}
      </div>
    </Link>
  );
}
