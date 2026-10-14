// The Dovie app icon as JSX for next/og's ImageResponse, used for the home
// screen icons (Android, iOS) and the web manifest.

const DOVE =
  "M9 23.5c4.2.3 7.4-.6 9.6-2.9l3-3.2c1.4-1.5 3.3-2.2 5.2-1.9l2.7.4-2.2 1.6c-.6.5-.9 1.2-.8 2l.3 2.3c.5 3.6-2.2 6.8-5.8 6.8h-1.8L15 31l1.2-3.4C13 27.2 10.5 25.8 9 23.5Z";
const WING = "M17.5 21.2 13 13.5c3.4.4 6.3 2 8.4 4.6l-3.9 3.1Z";

/**
 * @param size     square size in px
 * @param maskable true for Android adaptive icons: full-bleed background with
 *                 the dove kept inside the central safe zone (~60%).
 */
export function BrandIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const dove = Math.round(size * (maskable ? 0.58 : 0.78));
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ffe1ea 0%, #f9e4f5 55%, #ffe8dc 100%)",
        borderRadius: maskable ? 0 : Math.round(size * 0.22),
      }}
    >
      {/* Cropped tightly around the dove (it spans roughly x 9-30, y 13-31). */}
      <svg width={dove} height={dove} viewBox="6.5 9 26 26">
        <path fill="#e5567f" d={DOVE} />
        <path fill="#e5567f" fillOpacity={0.55} d={WING} />
        <circle cx="26.4" cy="17.6" r="0.9" fill="#ffffff" />
      </svg>
    </div>
  );
}
