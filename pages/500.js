// Custom 500 page for the Pages Router layer. See pages/404.js for rationale.
export default function Custom500() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>500 — Server Error</h1>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>Something went wrong. Please try again.</p>
      <a href="/" style={{ marginTop: "1.5rem", color: "#0066c0", textDecoration: "underline" }}>Go back to Home</a>
    </div>
  );
}
