#!/usr/bin/env node
/**
 * The company's social card: assets/og-home.png (1200x630).
 *
 *   node scripts/build-og-home.mjs
 *
 * Shown when the home page, the contact page or the blog index is shared.
 * Product pages have their own cards with their own icons; blog posts get
 * theirs from build-og.mjs. This one carries the CodeRipple Tech mark, so it
 * needs re-running only if the logo, the name or the tagline changes.
 *
 * Fonts are loaded from assets/fonts rather than the system, so the card
 * renders the same on any machine.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { mark } from "./logo-shape.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FONTS = ["Inter-Regular.ttf", "Inter-Bold.ttf", "Inter-ExtraBold.ttf"].map((f) => join(ROOT, "assets", "fonts", f));

const grid = [];
for (let x = 44; x < 1200; x += 44) grid.push(`<path d="M${x} 0V630"/>`);
for (let y = 44; y < 630; y += 44) grid.push(`<path d="M0 ${y}H1200"/>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="teal" cx="230" cy="40" r="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#22d3ce" stop-opacity="0.46"/><stop offset="1" stop-color="#22d3ce" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="purple" cx="1010" cy="560" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7d66fd" stop-opacity="0.4"/><stop offset="1" stop-color="#7d66fd" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22d3ce"/><stop offset="0.55" stop-color="#4c93f2"/><stop offset="1" stop-color="#7d66fd"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0e14"/>
  <rect width="1200" height="630" fill="url(#teal)"/>
  <rect width="1200" height="630" fill="url(#purple)"/>
  <g stroke="#ffffff" stroke-opacity="0.035" stroke-width="1" fill="none">${grid.join("")}</g>

  <g transform="translate(96 146)">
    <rect width="132" height="132" rx="31" fill="url(#tile)"/>
    <g transform="translate(66 66) scale(1.72) translate(-32 -32)">${mark("#ffffff")}</g>
  </g>

  <text x="94" y="398" font-family="Inter" font-weight="800" font-size="104" letter-spacing="-3.4" fill="#e8edf4">CodeRipple Tech</text>
  <text x="97" y="477" font-family="Inter" font-weight="400" font-size="40" fill="#93a1b5">Small tools. Big ripples.</text>
  <text x="97" y="582" font-family="Inter" font-weight="700" font-size="27" fill="#22d3ce">coderippletech.com</text>
</svg>`;

const png = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Inter" },
}).render().asPng();

writeFileSync(join(ROOT, "assets", "og-home.png"), png);
console.log(`assets/og-home.png — ${(png.length / 1024).toFixed(0)} KB`);
