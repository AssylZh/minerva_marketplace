/** Site-wide header with navigation, auth controls, theme toggle, and unread badge. */
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../services/api";

const POLL_INTERVAL_MS = 5000;

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") !== "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCount = () => {
      getUnreadCount().then(setUnreadCount);
    };
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <header>
      <div className="header-inner">
        <Link to="/" className="logo">
          Minerva Marketplace
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/items">Browse</NavLink>
              <NavLink to="/post">Post item</NavLink>
              <NavLink to="/messages">
                Messages{unreadCount > 0 && (
                  <span className="unread-badge" aria-label={`${unreadCount} unread messages`}>{unreadCount}</span>
                )}
              </NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </>
          )}
        </nav>
        <div className="nav-auth">
          <button type="button" className="theme-toggle" onClick={() => setDark(d => !d)} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? "☀️" : "🌙"}
          </button>
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: 14 }}>
                Hi, <strong>{user?.first_name}</strong>
              </span>
              <button type="button" onClick={logout} style={{ background: "var(--secondary-btn)", color: "var(--secondary-btn-text)" }}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/signup">Sign up</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
