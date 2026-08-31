/** Landing page with hero section and feature highlights. */
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <section className="card" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.5rem" }}>Buy and sell with other Minervans in your city!</h1>
        <p style={{ marginTop: 8, maxWidth: 520 }}>
          Minerva Marketplace provides an easy, sustainable solution for buying and selling items between Minervans in your city.
        </p>
        <div className="home-btn-row">
          <Link to="/items" className="home-btn-link btn-primary home-btn" style={{ textAlign: "center" }}>
            Browse items
          </Link>
          <Link to="/post" className="home-btn-link home-btn" style={{ textAlign: "center", background: "var(--secondary-btn)", color: "var(--secondary-btn-text)" }}>
            Post an item
          </Link>
        </div>
      </section>
      <section className="grid" style={{ gridTemplateColumns: "1fr", gap: 14 }}>
        <div className="card">
          <h3>For students, by students</h3>
          <p style={{ marginTop: 8 }}>Only students can list and buy, so you know who you are dealing with.</p>
        </div>
        <div className="card">
          <h3>Keep it on campus</h3>
          <p style={{ marginTop: 8 }}>Meet up in familiar spots.</p>
        </div>
        <div className="card">
          <h3>Give your stuff a second life</h3>
          <p style={{ marginTop: 8 }}>Turn unused items into cash, and help someone else out.</p>
        </div>
      </section>
    </div>
  );
}
