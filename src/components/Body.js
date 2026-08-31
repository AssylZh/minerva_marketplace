export default function Body({ children }) {
    return (
        <div className="Body" style={{ width: "100%", maxWidth: 1100, margin: "0 auto", padding: 24 }}>
            {children}
        </div>
    )
}