import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../services/authService";

const CITIES = ["San Francisco", "Buenos Aires", "Hyderabad", "Taipei", "Seoul", "Tokyo", "Berlin"];

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [cohort, setCohort] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await registerUser({ email, password, first_name: firstName, last_name: lastName, city, cohort });
      login({ ...data.user, token: data.token });
      navigate("/");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Sign up</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="firstName">First name</label>
        <input id="firstName" placeholder="Ada" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <label htmlFor="lastName">Last name</label>
        <input id="lastName" placeholder="Lovelace" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        <label htmlFor="email">Minerva email</label>
        <input id="email" type="email" placeholder="you@uni.minerva.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label htmlFor="city">Current city</label>
        <select id="city" value={city} onChange={(e) => setCity(e.target.value)} required>
          <option value="">Select your city</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label htmlFor="cohort">Cohort</label>
        <input id="cohort" placeholder="e.g. M27" value={cohort} onChange={(e) => setCohort(e.target.value)} required />
        {error && <div className="text-error" style={{ marginTop: 10 }}>{error}</div>}
        <button type="submit" className="btn-primary" style={{ marginTop: 16, width: "100%" }} disabled={loading}>
          {loading ? "Signing up..." : "Sign up"}
        </button>
        <p style={{ marginTop: 16, fontSize: 14 }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
