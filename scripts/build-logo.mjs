#!/usr/bin/env node
/**
 * Writes the CodeRipple Tech logo files from the shape in logo-shape.mjs.
 *
 *   node scripts/build-logo.mjs
 *
 *   assets/coderipple-mark.svg   the mark alone in the brand gradient, for dark backgrounds (navbar, footer)
 *   assets/coderipple-icon.svg   white on a gradient tile, without the outer ring, for browser tabs
 *
 * Run scripts/build-og-home.mjs afterwards if the shape changed, so the social
 * card matches.
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mark, BRAND_STOPS } from "./logo-shape.mjs";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <title>CodeRipple Tech</title>
  <defs>
    <linearGradient id="cr" gradientUnits="userSpaceOnUse" x1="6" y1="6" x2="58" y2="58">${BRAND_STOPS}</linearGradient>
  </defs>
  ${mark("url(#cr)")}
</svg>
`;

// At tab-icon size the outer ring turns to noise, so the icon keeps only the
// r and the C, a little larger, on a solid tile that shows on any tab colour.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <title>CodeRipple Tech</title>
  <defs>
    <linearGradient id="cr-tile" x1="0" y1="0" x2="1" y2="1">${BRAND_STOPS}</linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#cr-tile)"/>
  <g transform="translate(32 32) scale(1.12) translate(-32 -32)">${mark("#fff", false)}</g>
</svg>
`;

writeFileSync(join(ASSETS, "coderipple-mark.svg"), markSvg);
writeFileSync(join(ASSETS, "coderipple-icon.svg"), iconSvg);
console.log("wrote assets/coderipple-mark.svg and assets/coderipple-icon.svg");
