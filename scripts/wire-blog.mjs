/**
 * Wire the blog into the rest of the site.
 *
 * Idempotent on purpose: it is re-run after every pull, and every step checks
 * whether it has already been applied. Adding a product page later needs no
 * change here.
 *
 *   node wire-blog.mjs <site-root> <css-version>
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.argv[2];
const CSS_V = process.argv[3];

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "blog") return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : (e.name.endsWith(".html") ? [p] : []);
  });

let nav = 0, foot = 0, css = 0;

for (const file of walk(ROOT)) {
  const before = readFileSync(file, "utf8");
  let s = before;

  // Nav: only the corporate pages carry the products dropdown; product pages
  // have their own section links and are left alone.
  if (s.includes("nav-drop-btn") && !/<a href="\/blog\/">Writing<\/a>/.test(s)) {
    const after = s.replace(
      /(\s*)<a class="btn btn-ghost" href="\/contact\/">Contact<\/a>/,
      '$1<a href="/blog/">Writing</a>$1<a class="btn btn-ghost" href="/contact/">Contact</a>'
    );
    if (after !== s) { s = after; nav++; }
  }

  // Footer: every page with the structured footer gets Writing + RSS under
  // Support, so the blog is reachable from anywhere on the site.
  if (s.includes("<h4>Support</h4>") && !/<a href="\/blog\/feed\.xml">/.test(s)) {
    const after = s.replace(
      /(<h4>Support<\/h4>\s*\n(\s*)<a href="\/contact\/">Contact<\/a>)/,
      '$1\n$2<a href="/blog/">Writing</a>\n$2<a href="/blog/feed.xml">RSS feed</a>'
    );
    if (after !== s) { s = after; foot++; }
  }

  const bumped = s.replace(/site\.css\?v=\d+/g, `site.css?v=${CSS_V}`);
  if (bumped !== s) { s = bumped; css++; }

  if (s !== before) writeFileSync(file, s);
}

console.log(`nav links: ${nav}   footer links: ${foot}   css bumped: ${css}`);
