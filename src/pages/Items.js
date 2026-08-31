/** Browse page: lists items with filters, search, sort, tabs, and pagination. */
import { useEffect, useState, useCallback } from "react";
import ItemCard from "../components/ItemCard";
import Button from "../components/Button";
import API_BASE from "../config";
import emptyState from "../assets/empty-state.svg";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["All", "Appliance", "Furniture", "Electronics", "Textbooks", "Kitchen", "Books", "Clothing", "Other"];
const SORTS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Price (low to high)", value: "price_asc" },
  { label: "Price (high to low)", value: "price_desc" }
];
const PER_PAGE = 20;

export default function Items() {
  const { user } = useAuth();

  const [tab, setTab] = useState("offering");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/cities`)
      .then(r => r.json())
      .then(data => {
        setCities(data);
        if (city && !data.includes(city)) setCity("");
      })
      .catch(() => {});
  }, []);

  const buildUrl = useCallback((p) => {
    const params = new URLSearchParams({ listing_type: tab, page: p, per_page: PER_PAGE, sort });
    if (appliedSearch) params.set("q", appliedSearch);
    if (category !== "All") params.set("category", category);
    if (city) params.set("city", city);
    if (minPrice) params.set("min_price", String(Math.round(Number(minPrice) * 100)));
    if (maxPrice) params.set("max_price", String(Math.round(Number(maxPrice) * 100)));
    return `${API_BASE}/items?${params}`;
  }, [tab, appliedSearch, category, sort, city, minPrice, maxPrice]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setError("");
    fetch(buildUrl(1))
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setHasMore(data.has_more || false);
        setLoading(false);
        setInitialLoad(false);
      })
      .catch(() => { setError("Could not load items."); setLoading(false); });
  }, [buildUrl]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(search);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    fetch(buildUrl(nextPage))
      .then(r => r.json())
      .then(data => {
        setItems(prev => [...prev, ...(data.items || [])]);
        setHasMore(data.has_more || false);
        setPage(nextPage);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  return (
    <div className="container">
      <div className="browse-header">
        <h2 style={{ margin: 0 }}>Browse</h2>
        <div className="browse-filters">
          <form onSubmit={handleSearch} className="browse-search">
            <input
              placeholder="Search items..."
              aria-label="Search items"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="filter-input"
            />
            <Button variant="btn-primary" type="submit">Search</Button>
          </form>
          <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category" className="filter-input">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort order" className="filter-input">
            {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={city} onChange={e => setCity(e.target.value)} aria-label="Filter by city" className="filter-input">
            <option value="">All cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="number"
            placeholder="Min $"
            aria-label="Minimum price"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            min="0"
            className="filter-input"
            style={{ width: "80px" }}
          />
          <input
            type="number"
            placeholder="Max $"
            aria-label="Maximum price"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            min="0"
            className="filter-input"
            style={{ width: "80px" }}
          />
        </div>
      </div>

      <div className="browse-tabs">
        {[["offering", "Items for Sale"], ["request", "Requests"]].map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setTab(val)}
            className={`browse-tab ${tab === val ? "browse-tab--active" : "browse-tab--inactive"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="empty-state">Loading items...</p>}
      {error && <p className="empty-state text-error">{error}</p>}
      {!loading && !initialLoad && !error && items.length === 0 && (
        <div className="empty-state">
          <img src={emptyState} alt="No items" className="empty-state-img" />
          <div className="empty-state-title">No listings yet</div>
          <div style={{ color: "var(--text-faint)", marginBottom: 16 }}>Looks like there's nothing here yet.</div>
          <Link to="/post" className="btn-primary" style={{ textDecoration: "none", padding: "12px 20px" }}>
            Post an item
          </Link>
        </div>
      )}

      <div className="grid">
        {items.map(item => <ItemCard key={item.id} item={item} currentUserId={user?.id} />)}
      </div>

      {hasMore && (
        <div className="load-more-wrap">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-primary"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
