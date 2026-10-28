// Renders the app icons in public/icons/ with Next's built-in image renderer
// (next/og), so no image tooling is needed. Run: npm run icons
import { mkdir, writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const ACCENT = "#059669"; // emerald-600, the app's accent color

/**
 * A white "plate" ring with a bite out of it, on the accent color. `inset` is
 * the share of the canvas kept clear around the artwork: maskable icons get
 * cropped to a circle or squircle, so their artwork must sit in the middle 80%.
 */
function icon(size, { inset }) {
  const art = size * (1 - inset * 2) * 0.72;
  const stroke = art * 0.16;
  const r = (art - stroke) / 2;
  const c = art / 2;
  // A 270° arc from 12 o'clock round to 3 o'clock, leaving the top-right open.
  const arc = `M ${c} ${c - r} A ${r} ${r} 0 1 0 ${c + r} ${c}`;
  const dot = stroke * 0.7;
  return h(
    "div",
    {
      style: {
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ACCENT,
      },
    },
    h(
      "svg",
      { width: art, height: art, viewBox: `0 0 ${art} ${art}` },
      h("path", { d: arc, fill: "none", stroke: "white", strokeWidth: stroke }),
      h("circle", { cx: c, cy: c, r: dot, fill: "white" }),
    ),
  );
}

const icons = [
  { file: "icon-192.png", size: 192, inset: 0.08 },
  { file: "icon-512.png", size: 512, inset: 0.08 },
  { file: "icon-maskable-512.png", size: 512, inset: 0.14 },
  { file: "apple-touch-icon.png", size: 180, inset: 0.08 },
];

await mkdir("public/icons", { recursive: true });
for (const { file, size, ...options } of icons) {
  const png = await new ImageResponse(icon(size, options), {
    width: size,
    height: size,
  }).arrayBuffer();
  await writeFile(`public/icons/${file}`, Buffer.from(png));
  console.log(`public/icons/${file}`);
}
