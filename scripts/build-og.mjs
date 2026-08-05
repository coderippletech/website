#!/usr/bin/env node
/**
 * Per-post social cards.
 *
 * Every blog post gets its own 1200x630 PNG at assets/og/blog-<slug>.png, built
 * from the post's own title and topic. Before this, every post shared
 * og-home.png, so a link to any of them looked identical in a feed — same
 * wordmark, same tagline, nothing to tell you what you were about to read.
 *
 * Fonts are embedded rather than resolved from the system, so the card renders
 * byte-identically on a Windows laptop and an Ubuntu CI runner. That is the
 * whole reason for satori + resvg here rather than an SVG piped through
 * whatever rasteriser happens to be installed.
 *
 * Called by build-blog.mjs. Regenerates a card only when its inputs change, so
 * a normal build touches nothing and CI stays fast.
 *
 *   node scripts/build-og.mjs          rebuild what changed
 *   node scripts/build-og.mjs --force  rebuild everything
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets", "og");
const FONT_DIR = join(ROOT, "assets", "fonts");
const FORCE = process.argv.includes("--force");

const ACCENT = { teal: "#22d3ce", purple: "#7d66fd", sky: "#38bdf8" };

let satori, Resvg;
try {
  ({ default: satori } = await import("satori"));
  ({ Resvg } = await import("@resvg/resvg-js"));
} catch {
  // Dependencies are dev-only. A checkout without `npm install` should still be
  // able to build the blog; the cards simply keep whatever is already on disk.
  console.log("  og: satori/resvg not installed — keeping existing cards");
  satori = null;
}

const fonts = satori ? [
  { name: "Inter", data: readFileSync(join(FONT_DIR, "Inter-Regular.ttf")), weight: 400, style: "normal" },
  { name: "Inter", data: readFileSync(join(FONT_DIR, "Inter-Bold.ttf")), weight: 700, style: "normal" },
  { name: "Inter", data: readFileSync(join(FONT_DIR, "Inter-ExtraBold.ttf")), weight: 800, style: "normal" },
] : [];

/* Satori takes React-style element objects; this is the same shape without a
   JSX build step, which the rest of this repo does not have and does not want. */
const el = (type, props, ...children) => ({
  type, props: { ...props, children: children.length > 1 ? children : children[0] },
});

function card({ title, topicLabel, accent, minutes, date }) {
  return el("div", {
    style: {
      width: 1200, height: 630, display: "flex", flexDirection: "column",
      justifyContent: "space-between", padding: "68px 72px",
      background: "#0a0e14", fontFamily: "Inter", position: "relative",
    },
  },
    // A soft wash of the topic colour in one corner: enough to make the three
    // topics distinguishable at thumbnail size without printing a label twice.
    el("div", {
      style: {
        position: "absolute", top: -260, right: -200, width: 760, height: 760,
        borderRadius: 9999, opacity: 0.22,
        background: `radial-gradient(circle at 50% 50%, ${accent} 0%, rgba(10,14,20,0) 68%)`,
      },
    }),
    el("div", { style: { display: "flex", alignItems: "center", gap: 14 } },
      el("div", {
        style: {
          width: 12, height: 12, borderRadius: 9999, background: accent,
        },
      }),
      el("div", {
        style: {
          fontSize: 25, fontWeight: 700, color: accent, letterSpacing: 1.6,
          textTransform: "uppercase",
        },
      }, topicLabel),
    ),
    el("div", {
      style: {
        display: "flex", fontSize: title.length > 62 ? 62 : 74, fontWeight: 800,
        color: "#e8edf4", lineHeight: 1.1, letterSpacing: -2.2,
        maxWidth: 1010,
      },
    }, title),
    el("div", {
      style: {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 26,
      },
    },
      el("div", { style: { display: "flex", fontSize: 27, fontWeight: 700, color: "#e8edf4" } },
        "Dan Negoescu"),
      el("div", { style: { display: "flex", fontSize: 25, color: "#93a1b5" } },
        `coderippletech.com  ·  ${date}  ·  ${minutes} min read`),
    ),
  );
}

/**
 * @param {{slug,title,topicLabel,accent,minutes,date}[]} posts
 * @returns {string} a one-line summary for the build log
 */
export async function buildOgCards(posts) {
  mkdirSync(OUT_DIR, { recursive: true });

  // Drop cards whose post is gone, so unpublishing does not leave an orphan.
  const wanted = new Set(posts.map((p) => `blog-${p.slug}.png`));
  for (const f of readdirSync(OUT_DIR)) {
    if (f.startsWith("blog-") && f.endsWith(".png") && !wanted.has(f)) {
      rmSync(join(OUT_DIR, f));
    }
  }

  if (!satori) return "og: skipped (dependencies not installed)";

  // One manifest rather than a .stamp beside every card: the cards live in a
  // directory that ships to the CDN, and N sidecar files there is clutter.
  const manifestFile = join(OUT_DIR, "manifest.json");
  let manifest = {};
  try { manifest = JSON.parse(readFileSync(manifestFile, "utf8")); } catch { /* first run */ }

  const next = {};
  let built = 0, kept = 0;
  for (const p of posts) {
    const key = `blog-${p.slug}.png`;
    const out = join(OUT_DIR, key);
    // Fingerprint the inputs so an unchanged post is not re-rendered. Bump the
    // trailing number whenever the card design itself changes.
    const stamp = createHash("sha1")
      .update(JSON.stringify([p.title, p.topicLabel, p.accent, p.minutes, p.date, 3]))
      .digest("hex").slice(0, 12);
    next[key] = stamp;

    if (!FORCE && existsSync(out) && manifest[key] === stamp) { kept++; continue; }

    const svg = await satori(card(p), { width: 1200, height: 630, fonts });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
      .render().asPng();
    writeFileSync(out, png);
    built++;
  }
  writeFileSync(manifestFile, JSON.stringify(next, null, 2) + "\n");
  return `og: ${built} card${built === 1 ? "" : "s"} built, ${kept} unchanged`;
}

export { ACCENT };
