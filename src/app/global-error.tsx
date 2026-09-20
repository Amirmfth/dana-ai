"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 520 }}>
            <h1>Dana AI encountered an unexpected error.</h1>
            <p>Retry the request. If it continues, return to the application and try again later.</p>
            <button type="button" onClick={reset}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
