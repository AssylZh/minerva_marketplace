import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Body from "../components/Body";
import Button from "../components/Button";
import Heading from "../components/Heading";
import API_BASE, { formatPriceCents, itemImageSrc } from "../config";
import { useAuth } from "../context/AuthContext";

export default function Item() {
  const { itemID } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.token;
  const currentUserId = user?.id;

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/items/${itemID}`)
      .then((r) => r.json())
      .then((data) => {
        setItem(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [itemID]);

  const handleContact = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    const res = await fetch(`${API_BASE}/messages/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ item_id: parseInt(itemID, 10) }),
    });
    const convo = await res.json();
    navigate(`/messages?convo=${convo.id}`, {
      state: { other_user: item.seller?.first_name, item_title: item.title }
    });
  };

  const handleMarkAsSold = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/items/${itemID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "sold" }),
      });
      const data = await res.json();
      if (res.ok) {
        setItem(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    const confirmed = window.confirm("Delete this listing? This action cannot be undone.");
    if (!confirmed) return;

    setDeleteError("");
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/items/${itemID}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        navigate("/dashboard");
      } else {
        const payload = await res.json().catch(() => ({}));
        setDeleteError(payload.error || "Could not delete listing. Please try again.");
      }
    } catch {
      setDeleteError("Could not delete listing. Please check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Body><p>Loading...</p></Body>;
  if (!item) return <Body><p>Item not found.</p></Body>;

  const isSeller = currentUserId === item.seller_id;

  return (
    <Body>
      <div className="card" style={{ maxWidth: 600, margin: "0 auto" }}>
        <>
          <img
            src={itemImageSrc(item.image_url)}
            alt={item.title}
            style={{
              width: "100%",
              maxHeight: 280,
              objectFit: "cover",
              borderRadius: 8,
              marginBottom: 16,
            }}
          />
          <Heading level={2}>{item.title}</Heading>
          <p>
            <strong>{formatPriceCents(item.price)}</strong> · {item.condition}
          </p>
          <p>{item.description}</p>
          {(item.purchased_from || item.purchased_year) && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              🛒 Bought
              {item.purchased_from ? ` from ${item.purchased_from}` : ""}
              {item.purchased_year ? ` in ${item.purchased_year}` : ""}
            </p>
          )}
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>📍 {item.location}</p>
          <p
            style={{
              fontSize: "13px",
              color: item.status === "active" ? "var(--success)" : "var(--text-faint)",
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          >
            Status: {item.status}
          </p>
          {deleteError && <p className="text-error" style={{ marginTop: 8 }}>{deleteError}</p>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {isSeller ? (
              <>
                <Button onClick={() => navigate(`/items/${itemID}/edit`)} variant="btn-primary">
                  Edit listing
                </Button>
                {item.status !== "sold" && item.listing_type !== "request" && (
                  <Button onClick={handleMarkAsSold}>
                    {saving ? "Updating..." : "Mark as sold"}
                  </Button>
                )}
                <Button onClick={handleDelete} variant="btn-danger">
                  {deleting ? "Deleting..." : "Delete listing"}
                </Button>
              </>
            ) : (
              item.status !== "sold" && (
                <Button onClick={handleContact} variant="btn-primary">
                  Contact Seller
                </Button>
              )
            )}
          </div>
          {item.seller && (
            <div
              style={{
                marginTop: 24,
                padding: "16px",
                background: "var(--bg)",
                borderRadius: "8px",
                borderTop: "1px solid var(--border-light)",
              }}
            >
              <p
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "13px",
                  color: "var(--text-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Seller
              </p>
              <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
                {item.seller.first_name} {item.seller.last_name}
              </p>
              <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "var(--text-muted)" }}>
                {item.seller.city} · Cohort {item.seller.cohort}
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-faint)" }}>
                Member since{" "}
                {new Date(item.seller.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </>
      </div>
    </Body>
  );
}
