"use client";

/**
 * Last-resort boundary for errors thrown inside the ROOT layout itself.
 * Must render its own <html>/<body> because the layout is unavailable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fff",
          color: "#1c1c1f",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            textAlign: "center",
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#6b6b70", maxWidth: 420, margin: 0 }}>
            A temporary error interrupted this page. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 44,
              padding: "0 24px",
              borderRadius: 8,
              border: "none",
              background: "#1c1c1f",
              color: "#fff",
              fontSize: 14,
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
