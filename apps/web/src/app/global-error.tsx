"use client";

// The last safety net: replaces the whole page, root layout included, so it
// brings its own <html> and plain inline styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#fcf9f6",
          color: "#2b2533",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "2rem", margin: 0 }}>Dovie hit a snag.</h1>
          <p style={{ color: "#6f6779", fontSize: "0.9rem" }}>Your data is safe. Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "10px 20px",
              background: "#e88aa6",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
