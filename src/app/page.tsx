/**
 * Placeholder landing page.
 * Phase 6 replaces this with the full Amazon-style landing screen.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-ink">ReLoop</h1>
      <p className="max-w-md text-storm">
        Millions of products. No intelligent bridge. — Backend foundation is
        live. The full experience is built across phases 6–8.
      </p>
      <a
        href="/api/health"
        className="rounded-lg bg-squid px-5 py-2 font-medium text-white transition hover:opacity-90"
      >
        Check API health
      </a>
    </main>
  );
}
