// Generates Dovie's favicons from one SVG design, so every size matches.
// Run from apps/web:  npm run icons
//
// Writes:
//   src/app/icon.svg     vector favicon for modern browsers (Next serves it)
//   src/app/favicon.ico  16, 32 and 48 px PNGs for older browsers / Windows
//   public/icon.svg      same mark, used by the manifest and structured data
//
// The PWA and Apple icons are drawn in src/lib/brand-icon.tsx with the same
// colours and dove.
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { ImageResponse } from "next/og.js";

// Brand rose, top-left light to bottom-right deep.
const ROSE_LIGHT = "#f27a9b";
const ROSE_DEEP = "#d9466f";

const DOVE =
  "M9 23.5c4.2.3 7.4-.6 9.6-2.9l3-3.2c1.4-1.5 3.3-2.2 5.2-1.9l2.7.4-2.2 1.6c-.6.5-.9 1.2-.8 2l.3 2.3c.5 3.6-2.2 6.8-5.8 6.8h-1.8L15 31l1.2-3.4C13 27.2 10.5 25.8 9 23.5Z";
const WING = "M17.5 21.2 13 13.5c3.4.4 6.3 2 8.4 4.6l-3.9 3.1Z";

/**
 * The mark on a 64-unit canvas: a rounded rose tile with a white dove.
 * `tiny` (16 px) drops the eye and makes the wing solid so it stays legible.
 */
function faviconSvg({ tiny = false } = {}) {
  // The dove spans about x 9-30, y 13-31 in its own 40-unit space; scale it to
  // ~72% of the tile and centre it optically (a touch left and up).
  const scale = tiny ? 2.35 : 2.2;
  const tx = 31.5 - 19.5 * scale;
  const ty = 32.5 - 22 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="dovie-rose" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ROSE_LIGHT}"/>
      <stop offset="1" stop-color="${ROSE_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#dovie-rose)"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale})">
    <path fill="#ffffff" fill-opacity="${tiny ? 1 : 0.72}" d="${WING}"/>
    <path fill="#ffffff" d="${DOVE}"/>${tiny ? "" : `\n    <circle cx="26.4" cy="17.6" r="0.95" fill="${ROSE_DEEP}"/>`}
  </g>
</svg>
`;
}

async function png(size) {
  const svg = faviconSvg({ tiny: size <= 16 });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const res = new ImageResponse(createElement("img", { src, width: size, height: size }), { width: size, height: size });
  return Buffer.from(await res.arrayBuffer());
}

/** An ICO file holding PNG images (supported by every browser since IE Vista-era). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) images.push({ size, data: await png(size) });

writeFileSync("src/app/favicon.ico", ico(images));
writeFileSync("src/app/icon.svg", faviconSvg());
writeFileSync("public/icon.svg", faviconSvg());
// Optional previews of each size, e.g. PREVIEW_DIR=/tmp npm run icons
if (process.env.PREVIEW_DIR) {
  for (const { size, data } of images) writeFileSync(`${process.env.PREVIEW_DIR}/favicon-${size}.png`, data);
}

console.log(`Wrote favicon.ico (${sizes.join(", ")} px), src/app/icon.svg and public/icon.svg`);
