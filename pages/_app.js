// Minimal Pages Router _app — only used for the /404, /500, and _error pages.
// Does NOT import any App Router components, contexts, or native packages.
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
