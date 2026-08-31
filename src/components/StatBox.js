export default function StatBox({ label, value, color }) {
  return (
    <div style={{ minWidth: 120, background: color + "18", color, borderRadius: 10, padding: "18px 20px", fontWeight: 600, fontSize: 18, textAlign: "center", boxShadow: "0 1px 4px #0001" }}>
      <div style={{ fontSize: 28 }}>{value}</div>
      <div style={{ fontSize: 14 }}>{label}</div>
    </div>
  );
}
