import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../config";
import Body from "../components/Body";
import Button from "../components/Button";
import Heading from "../components/Heading";

const CATEGORIES = [
  "Appliance", "Furniture", "Electronics", "Textbooks",
  "Kitchen", "Books", "Clothing", "Other",
];

const CONDITIONS = ["New", "Like New", "Good", "Fair"];

const MINERVA_CITIES = [
  "San Francisco", "Buenos Aires", "Hyderabad",
  "Taipei", "Seoul", "Tokyo", "Berlin",
];

const EMPTY_FORM = {
  title: "", category: "", condition: "", price: "",
  budget: "", location: "", description: "",
  purchasedFrom: "", purchasedYear: "",
};

export default function Post() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.token;

  const [listingType, setListingType] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetFormState = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setImageFile(null);
    setError("");
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = "Title is required.";
    if (!form.category) errors.category = "Category is required.";
    if (!form.location) errors.location = "Location is required.";

    if (listingType === "offering") {
      if (!form.condition) errors.condition = "Please select a condition.";
      const trimmedPrice = form.price.trim();
      if (trimmedPrice === "") {
        errors.price = "Price is required.";
      } else {
        const priceNum = Number(trimmedPrice);
        if (!Number.isFinite(priceNum) || priceNum < 0) {
          errors.price = "Price must be a valid number.";
        }
      }
    }

    if (listingType === "request") {
      const trimmedBudget = form.budget.trim();
      if (trimmedBudget !== "") {
        const budgetNum = Number(trimmedBudget);
        if (!Number.isFinite(budgetNum) || budgetNum < 0) {
          errors.budget = "Budget must be a valid number.";
        }
      }
    }

    const trimmedYear = form.purchasedYear.trim();
    if (trimmedYear && (!/^\d{4}$/.test(trimmedYear))) {
      errors.purchased_year = "Must be a 4-digit year (e.g. 2023).";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!token) {
      setError("Please log in before posting an item.");
      return;
    }

    setLoading(true);

    try {
      let priceCents = 0;
      if (listingType === "offering") {
        priceCents = Math.round(Number(form.price.trim()) * 100);
      } else if (form.budget.trim() !== "") {
        priceCents = Math.round(Number(form.budget.trim()) * 100);
      }

      const body = new FormData();
      body.append("title", form.title.trim());
      body.append("category", form.category);
      body.append("location", form.location);
      body.append("description", form.description.trim());
      body.append("listing_type", listingType);
      if (priceCents > 0) {
        body.append("price_cents", String(priceCents));
      }

      if (listingType === "offering") {
        body.append("condition", form.condition);
      }
      if (form.purchasedFrom.trim()) {
        body.append("purchased_from", form.purchasedFrom.trim());
      }
      if (form.purchasedYear.trim()) {
        body.append("purchased_year", form.purchasedYear.trim());
      }
      if (imageFile) {
        body.append("image", imageFile);
      }

      const res = await fetch(`${API_BASE}/items`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      let data;
      try { data = await res.json(); } catch { data = {}; }

      if (!res.ok) {
        if (data.fields) {
          setFieldErrors(data.fields);
        } else {
          setError(data.error || "Could not create listing.");
        }
      } else {
        navigate(data.id ? `/items/${data.id}` : "/items");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!listingType) {
    return (
      <Body>
        <Heading level={2}>What do you want to post?</Heading>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button className="btn-primary" onClick={() => { resetFormState(); setListingType("offering"); }} style={{ padding: "20px", fontSize: "1.1rem" }}>
            I want to sell something
          </button>
          <button className="btn-secondary" onClick={() => { resetFormState(); setListingType("request"); }} style={{ padding: "20px", fontSize: "1.1rem" }}>
            I'm looking for something
          </button>
        </div>
      </Body>
    );
  }

  const isOffering = listingType === "offering";

  return (
    <Body>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button onClick={() => { resetFormState(); setListingType(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: "0.9rem" }}>
          Back
        </button>
        <Heading level={2}>{isOffering ? "Sell an item" : "Post a request"}</Heading>
      </div>

      <form className="card" onSubmit={handleSubmit} noValidate>
        {error && <p className="text-error" style={{ marginBottom: 12 }}>{error}</p>}

        <label htmlFor="title">{isOffering ? "Item name" : "What are you looking for?"} *</label>
        <input id="title" name="title" placeholder={isOffering ? "e.g. Rice cooker" : "e.g. Desk lamp"} value={form.title} onChange={handleChange} />
        {fieldErrors.title && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 2 }}>{fieldErrors.title}</p>}

        <label htmlFor="category">Category *</label>
        <select id="category" name="category" value={form.category} onChange={handleChange}>
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {fieldErrors.category && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 2 }}>{fieldErrors.category}</p>}

        {isOffering && (
          <>
            <label htmlFor="condition">Condition *</label>
            <select id="condition" name="condition" value={form.condition} onChange={handleChange}>
              <option value="">Select condition</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {fieldErrors.condition && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 2 }}>{fieldErrors.condition}</p>}
          </>
        )}

        {isOffering ? (
          <>
            <label htmlFor="price">Price ($) *</label>
            <input id="price" name="price" type="number" min="0" step="0.01" placeholder="e.g. 25 (enter 0 for free)" value={form.price} onChange={handleChange} />
            {fieldErrors.price && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 2 }}>{fieldErrors.price}</p>}
          </>
        ) : (
          <>
            <label htmlFor="budget">Maximum budget ($) <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
            <input id="budget" name="budget" type="number" min="0" step="0.01" placeholder="e.g. 50" value={form.budget} onChange={handleChange} />
            {fieldErrors.budget && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 2 }}>{fieldErrors.budget}</p>}
          </>
        )}

        <label htmlFor="location">Location *</label>
        <select id="location" name="location" value={form.location} onChange={handleChange}>
          <option value="">Select a city</option>
          {MINERVA_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>
        {fieldErrors.location && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 2 }}>{fieldErrors.location}</p>}

        {isOffering && (
          <>
            <label htmlFor="purchasedFrom">Where did you buy it? <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
            <input id="purchasedFrom" name="purchasedFrom" placeholder="e.g. Amazon, IKEA" value={form.purchasedFrom} onChange={handleChange} />

            <label htmlFor="purchasedYear">Year purchased <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
            <input id="purchasedYear" name="purchasedYear" placeholder="e.g. 2023" maxLength={4} value={form.purchasedYear} onChange={handleChange} />
            {fieldErrors.purchased_year && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 2 }}>{fieldErrors.purchased_year}</p>}
          </>
        )}

        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} placeholder={isOffering ? "Any details buyers should know" : "Describe what you're looking for"} value={form.description} onChange={handleChange} />

        <label htmlFor="image">Photo (optional)</label>
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ marginBottom: 8 }} />

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <Button variant="btn-primary" type="submit" disabled={loading}>
            {loading ? "Posting..." : isOffering ? "Post listing" : "Post request"}
          </Button>
        </div>
      </form>
    </Body>
  );
}
