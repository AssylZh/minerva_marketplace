import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Body from "../components/Body";
import Heading from "../components/Heading";
import ItemCard from "../components/ItemCard";
import StatBox from "../components/StatBox";
import SectionCard from "../components/SectionCard";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../services/api";

export default function Dashboard() {
    const [stats, setStats] = useState({ active_count: 0, sold_count: 0, unread_messages: 0 });
    const [activeListings, setActiveListings] = useState([]);
    const [soldListings, setSoldListings] = useState([]);
    const [recentMessages, setRecentMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { user } = useAuth();
    const token = user?.token;

    useEffect(() => {
        apiFetch("/me/dashboard")
            .then(res => res.json())
            .then(data => {
                setStats(data.stats || { active_count: 0, sold_count: 0, unread_messages: 0 });
                setActiveListings(data.active_listings || []);
                setSoldListings(data.sold_listings || []);
                setRecentMessages(data.recent_messages || []);
                setLoading(false);
            })
            .catch(() => { setError("Could not load dashboard."); setLoading(false); });
    }, [token]);

    if (loading) return <Body><p>Loading...</p></Body>;
    if (error) return <Body><p className="text-error">{error}</p></Body>;

    return (
        <Body>
            <Heading level={2}>My Dashboard</Heading>

            {/* Quick Stats */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: 24 }}>
                <StatBox label="Active Listings" value={stats.active_count} color="var(--info)" />
                <StatBox label="Sold Items" value={stats.sold_count} color="var(--success)" />
                <StatBox label="Unread Messages" value={stats.unread_messages} color="var(--accent)" />
            </div>

            {/* Active Listings */}
            <SectionCard title="Active Listings">
                {activeListings.length === 0 ? (
                    <p style={{ color: "var(--text-muted)" }}>No active listings. <Link to="/post" style={{ color: "var(--accent)" }}>Post something!</Link></p>
                ) : (
                    <div className="grid">
                        {activeListings.map(item => <ItemCard key={item.id} item={item} />)}
                    </div>
                )}
            </SectionCard>

            {/* Sold Items */}
            <SectionCard title="Sold Items">
                {soldListings.length === 0 ? (
                    <p style={{ color: "var(--text-muted)" }}>No sold items yet.</p>
                ) : (
                    <div className="grid">
                        {soldListings.map(item => <ItemCard key={item.id} item={item} />)}
                    </div>
                )}
            </SectionCard>

            {/* Recent Messages */}
            <SectionCard title="Recent Messages">
                {recentMessages.length === 0 ? (
                    <p style={{ color: "var(--text-muted)" }}>No messages yet.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {recentMessages.map(m => (
                            <Link key={m.id} to="/messages" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border-light)", color: "inherit" }}>
                                <div>
                                    <strong>{m.other_user}</strong>
                                    <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>{m.last_message || "No messages yet"}</p>
                                </div>
                                <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>{m.item_title}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </SectionCard>
        </Body>
    );
}
