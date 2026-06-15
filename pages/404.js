// Custom 404 page for the Pages Router layer. Next.js 14 always prerenders
// /404 and /500 through the Pages Router even in App Router projects. This
// file exists solely to prevent the prerender from pulling in server chunks
// that reference next/document internals.
export default function Custom404() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>404 — Page Not Found</h1>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>The page you are looking for does not exist.</p>
      <a href="/" style={{ marginTop: "1.5rem", color: "#0066c0", textDecoration: "underline" }}>Go back to Home</a>
    </div>
  );
}
