"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="text-6xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-full bg-yellow-400 px-6 py-2 text-sm font-medium text-gray-900 hover:bg-yellow-500"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
