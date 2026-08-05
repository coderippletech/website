/**
 * Artwork for the Ripple Effect squad: a circular avatar and a wide cover.
 *
 * First attempt was evenly spaced concentric rings around a centred core, which
 * reads as a bullseye rather than a ripple. This one draws the actual idea: a
 * struck point, its rings running outward and thinning as they go, and a second
 * smaller point further out that has started ringing in response. That is the
 * ripple effect, and it is also "small tools, big ripples".
 *
 * Constraints that shaped it:
 *   - it is cropped to a circle and shown at 40px in a members list, so the
 *     primary strike has to survive alone at that size;
 *   - the secondary strike is the detail that rewards looking at it larger;
 *   - rings are arcs, not closed circles, so the shape reads as motion.
 */
import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const VIOLET_DEEP = "#1b024b";
const VIOLET = "#7966f7";
const VIOLET_LIGHT = "#b4a9ff";
const TEAL = "#3ee8e2";
const INK = "#0a0e14";

/**
 * An arc of `sweep` degrees centred on `mid`, at radius r. Open rings imply
 * travel; closed ones sit still.
 *
 * A full 360 has to be two half-arcs: with one arc command the start and end
 * points coincide, and SVG resolves that to a zero-length path — which renders
 * as a single stray dot where the ring should be.
 */
function arc(r, mid, sweep) {
  const p = (a) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  if (sweep >= 360) {
    return `M ${p(0)} A ${r} ${r} 0 1 1 ${p(Math.PI)} A ${r} ${r} 0 1 1 ${p(0)}`;
  }
  const a0 = ((mid - sweep / 2) * Math.PI) / 180;
  const a1 = ((mid + sweep / 2) * Math.PI) / 180;
  return `M ${p(a0)} A ${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${p(a1)}`;
}

const defs = (prefix) => `
    <radialGradient id="${prefix}bg" cx="46%" cy="34%" r="82%">
      <stop offset="0%" stop-color="#2a1566"/>
      <stop offset="52%" stop-color="#160b33"/>
      <stop offset="100%" stop-color="${INK}"/>
    </radialGradient>
    <radialGradient id="${prefix}core" cx="40%" cy="34%" r="72%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="${VIOLET_LIGHT}"/>
      <stop offset="100%" stop-color="${VIOLET}"/>
    </radialGradient>
    <radialGradient id="${prefix}glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${VIOLET}" stop-opacity="0.62"/>
      <stop offset="100%" stop-color="${VIOLET}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${prefix}glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${TEAL}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${TEAL}" stop-opacity="0"/>
    </radialGradient>`;

/** The struck point and its wake. */
function strike({ x, y, core, rings, coreFill, glow, glowR }) {
  return `
  <circle cx="${x}" cy="${y}" r="${glowR}" fill="url(#${glow})"/>
  <g transform="translate(${x} ${y})" fill="none" stroke-linecap="round">
    ${rings.map(([r, w, o, c, mid, sweep]) =>
      `<path d="${arc(r, mid, sweep)}" stroke="${c}" stroke-width="${w}" opacity="${o}"/>`
    ).join("\n    ")}
  </g>
  <circle cx="${x}" cy="${y}" r="${core}" fill="url(#${coreFill})"/>`;
}

const avatar = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>${defs("a")}</defs>
  <rect width="512" height="512" fill="url(#abg)"/>

  ${/* Primary strike, up and left of centre so the wake has room to travel. */""}
  ${strike({
    x: 208, y: 214, core: 33, coreFill: "acore", glow: "aglow", glowR: 190,
    rings: [
      [70, 14, 1.00, VIOLET_LIGHT, 0, 360],
      [108, 11, 0.82, VIOLET, 20, 320],
      [150, 8.5, 0.58, VIOLET, 35, 285],
      [196, 6, 0.34, VIOLET, 45, 250],
      [246, 4, 0.18, TEAL, 50, 215],
    ],
  })}

  ${/* The response: smaller, teal, already ringing back. */""}
  ${strike({
    x: 372, y: 366, core: 15, coreFill: "acore", glow: "aglow2", glowR: 120,
    rings: [
      [36, 7.5, 0.85, TEAL, 180, 300],
      [60, 5.5, 0.52, TEAL, 195, 260],
      [88, 4, 0.28, TEAL, 205, 220],
    ],
  })}
</svg>`;

const cover = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 480" width="1440" height="480">
  <defs>
    ${defs("c")}
    <linearGradient id="cbg2" x1="0" y1="0" x2="1" y2="0.6">
      <stop offset="0%" stop-color="${INK}"/>
      <stop offset="60%" stop-color="#150c30"/>
      <stop offset="100%" stop-color="${VIOLET_DEEP}"/>
    </linearGradient>
    <pattern id="cgrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1440" height="480" fill="url(#cbg2)"/>
  <rect width="1440" height="480" fill="url(#cgrid)"/>

  ${/* Right of centre and running off both edges: a fragment of something
       larger survives an unknown crop better than a centred motif. */""}
  ${strike({
    x: 1046, y: 230, core: 30, coreFill: "ccore", glow: "cglow", glowR: 400,
    rings: [
      [74, 13, 1.00, VIOLET_LIGHT, 0, 360],
      [124, 10, 0.78, VIOLET, 15, 330],
      [182, 7.5, 0.52, VIOLET, 30, 295],
      [248, 5.5, 0.30, VIOLET, 40, 260],
      [322, 4, 0.17, TEAL, 48, 225],
      [404, 3, 0.09, TEAL, 55, 195],
    ],
  })}
  ${strike({
    x: 700, y: 372, core: 13, coreFill: "ccore", glow: "cglow2", glowR: 190,
    rings: [
      [34, 7, 0.75, TEAL, 180, 300],
      [58, 5, 0.44, TEAL, 195, 255],
      [86, 3.5, 0.22, TEAL, 205, 215],
    ],
  })}
</svg>`;

for (const [name, svg, w] of [["squad-avatar", avatar(), 512], ["squad-cover", cover(), 1440]]) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: w } }).render().asPng();
  writeFileSync(`${"assets/brand"}/${name}.png`, png);
  console.log(`${name}.png  ${(png.length / 1024) | 0}KB`);
}
