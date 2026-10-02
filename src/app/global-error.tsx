"use client";

// Last-resort screen when even the root layout fails (for example, the database is unreachable).
// It cannot rely on globals.css or fonts, so it carries its own minimal styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#fbf7f0", color: "#231d17", fontFamily: "system-ui, sans-serif", fontSize: 20 }}>
        <main style={{ maxWidth: 560, margin: "15vh auto", padding: "0 20px", textAlign: "center", lineHeight: 1.6 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, lineHeight: 1.2 }}>SYNAPSE is having trouble right now</h1>
          <p>Nothing you saved has been lost. Please check your internet connection and try again in a moment.</p>
          <button
            onClick={() => reset()}
            style={{ marginTop: 16, minHeight: 56, padding: "0 28px", fontSize: 20, fontWeight: 600, color: "#fff", background: "#a8461f", border: 0, borderRadius: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
