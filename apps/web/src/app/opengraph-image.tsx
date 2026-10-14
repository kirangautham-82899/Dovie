import { ImageResponse } from "next/og";

// The share card shown by WhatsApp, X, LinkedIn, Slack and search previews.
// Generated once at build time.

export const alt = "Dovie: daily planner, habit tracker, budget app and private journal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGS = ["Daily planner", "Habit tracker", "Expense & budget", "Private journal", "Mood & sleep"];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #ffe4ee 0%, #f6e6fb 50%, #ffeadf 100%)",
          color: "#3b1f2b",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 40 40">
              <path
                fill="#e5567f"
                d="M9 23.5c4.2.3 7.4-.6 9.6-2.9l3-3.2c1.4-1.5 3.3-2.2 5.2-1.9l2.7.4-2.2 1.6c-.6.5-.9 1.2-.8 2l.3 2.3c.5 3.6-2.2 6.8-5.8 6.8h-1.8L15 31l1.2-3.4C13 27.2 10.5 25.8 9 23.5Z"
              />
            </svg>
          </div>
          <div style={{ fontSize: 48 }}>dovie.</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "#e5567f", letterSpacing: 2, textTransform: "uppercase", fontFamily: "sans-serif" }}>
            Daily planner · habit tracker · budget app
          </div>
          <div style={{ fontSize: 92, lineHeight: 1.02, marginTop: 14 }}>A softer place</div>
          <div style={{ fontSize: 92, lineHeight: 1.02, color: "#e5567f", fontStyle: "italic" }}>to start again.</div>
        </div>

        <div style={{ display: "flex", gap: 14, fontFamily: "sans-serif" }}>
          {TAGS.map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                height: 56,
                flexShrink: 0,
                whiteSpace: "nowrap",
                fontSize: 24,
                padding: "0 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.75)",
                color: "#7a2e4a",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
