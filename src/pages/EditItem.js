import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Body from "../components/Body";
import Button from "../components/Button";
import Heading from "../components/Heading";
import API_BASE from "../config";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = [
  "Appliance",
  "Furniture",
  "Electronics",
  "Textbooks",
  "Kitchen",
  "Books",
  "Clothing",
  "Other",
];
const CONDITIONS = ["New", "Like New", "Good", "Fair"];
const STATUSES = ["active", "reserved", "sold"];
const CITIES = ["San Francisco", "Buenos Aires", "Hyderabad", "Taipei", "Seoul", "Tokyo", "Berlin"];

function toPriceCents(value) {
  const raw = (value || "").trim().toLowerCase();
  if (!raw || raw === "free") return 0;
  const num = Number(raw);
  if (Number.isNaN(num)) return 0;
  return Math.round(num * 100);
}

export default function EditItem() {
  const { itemID } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.token;
  const currentUserId = user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: CATEGORIES[0],
    price: "",
    condition: CONDITIONS[2],
    location: "",
    description: "",
    status: "active",
  });

  useEffect(() => {
    if (!token || currentUserId == null) return;

    setLoading(true);
    fetch(`${API_BASE}/items/${itemID}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.id) throw new Error("Not found");
        if (currentUserId !== data.seller_id) {
          navigate(`/items/${itemID}`);
          return;
        }
        setForm({
          title: data.title || "",
          category: data.category || CATEGORIES[0],
          price: data.price === 0 ? "Free" : String((data.price || 0) / 100),
          condition: data.condition || CONDITIONS[2],
          location: data.location || "",
          description: data.description || "",
          status: data.status || "active",
        });
      })
      .catch(() => setError("Could not load listing for editing."))
      .finally(() => setLoading(false));
  }, [itemID, currentUserId, navigate, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Please log in before editing a listing.");
      return;
    }
    if (!form.title.trim() || !form.category || !form.location) {
      setError("Title, category, and location are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/items/${itemID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          price_cents: toPriceCents(form.price),
          condition: form.condition,
          location: form.location,
          description: form.description || "",
          status: form.status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save changes. Please try again.");
        return;
      }
      navigate(`/items/${itemID}`);
    } catch {
      setError("Could not save changes. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Body><p>Loading...</p></Body>;

  return (
    <Body>
      <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
        <Heading level={2}>Edit Listing</Heading>
        <form onSubmit={handleSubmit}>
          <label htmlFor="title">Item name</label>
          <input id="title" name="title" value={form.title} onChange={handleChange} required />

          <label htmlFor="category">Category</label>
          <select id="category" name="category" value={form.category} onChange={handleChange} required>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label htmlFor="price">Price</label>
          <input
            id="price"
            name="price"
            value={form.price}
            placeholder="2000 or Free"
            onChange={handleChange}
          />

          <label htmlFor="condition">Condition</label>
          <select id="condition" name="condition" value={form.condition} onChange={handleChange}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label htmlFor="location">Location</label>
          <select id="location" name="location" value={form.location} onChange={handleChange} required>
            <option value="">Select your city</option>
            {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>

          <label htmlFor="status">Status</label>
          <select id="status" name="status" value={form.status} onChange={handleChange}>
            {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>

          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} value={form.description} onChange={handleChange} />

          {error && <p className="text-error" style={{ marginTop: 12 }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <Button type="button" onClick={() => navigate(`/items/${itemID}`)}>Cancel</Button>
            <Button variant="btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </Body>
  );
}
