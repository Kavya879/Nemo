// Custom error page for the Pages Router layer. Overrides the default _error
// which imports from next/document and causes build failures when server chunks
// containing native packages (onnxruntime-node) are resolved during prerender.
function ErrorPage({ statusCode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
        {statusCode ? `${statusCode} — Server Error` : "An error occurred"}
      </h1>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>Something went wrong. Please try again.</p>
      <a href="/" style={{ marginTop: "1.5rem", color: "#0066c0", textDecoration: "underline" }}>Go back to Home</a>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
