/**
 * The CodeRipple Tech mark, as geometry.
 *
 * A small r in the middle, a ring around it that reads as a C, and one broken
 * ring outside: the initials, and the ripple spreading from them. Everything is
 * one rounded line on a 64x64 box centred on (32, 32).
 *
 * This file only describes the shape. build-logo.mjs writes the SVG files and
 * build-og-home.mjs draws it on the social card, so the logo has one source.
 */

const n = (v) => +v.toFixed(2);
const at = (r, deg) => [n(32 + r * Math.cos(deg * Math.PI / 180)), n(32 + r * Math.sin(deg * Math.PI / 180))];
// A piece of a ring: radius r, clockwise from a0 to a1 (degrees; 0 = right, 90 = down).
const arc = (r, a0, a1) => {
  const [x0, y0] = at(r, a0), [x1, y1] = at(r, a1);
  const sweep = (((a1 - a0) % 360) + 360) % 360;
  return `M${x0} ${y0}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

/** The r: a stem and an arm, drawn at the same weight as the C. */
export const R_PATH = "M26.7 40V24M26.7 30.8A6.8 6.8 0 0 1 37.4 25.23";
/** The C: one ring, open on the right. */
export const C_PATH = arc(17.5, 40, 320);
/** The ripple: one outer ring in three pieces. */
export const RIPPLE_PATH = [[-50, 30], [190, 282], [62, 165]].map(([a, b]) => arc(25.2, a, b)).join("");

/**
 * The mark as SVG elements, to be placed inside a 64x64 viewBox.
 * @param {string} ink    any SVG paint (a colour, or url(#gradient))
 * @param {boolean} ripple  include the outer ring; left out at very small sizes
 */
export function mark(ink, ripple = true) {
  return `<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path stroke-width="5" d="${R_PATH}"/>` +
    `<path stroke-width="5" d="${C_PATH}"/>` +
    (ripple ? `<path stroke-width="3.4" d="${RIPPLE_PATH}"/>` : "") +
    `</g>`;
}

export const BRAND_STOPS = `<stop offset="0" stop-color="#22d3ce"/><stop offset="0.55" stop-color="#4c93f2"/><stop offset="1" stop-color="#7d66fd"/>`;
