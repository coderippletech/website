#!/usr/bin/env node
/**
 * sync-chrome.mjs — one navbar and one "more tools" strip, on every page.
 *
 *   node scripts/sync-chrome.mjs
 *
 * The site has no templating, so the navbar is repeated in every HTML file.
 * This script is the single source for the parts that must agree everywhere:
 *
 *   - the Products menu (a <details> element) in every page's nav
 *   - the "CodeRipple Tech / Product" crumb on product pages
 *   - the "More from CodeRipple Tech" strip above the footer on product pages
 *   - the font links, the shared /site.js, and the skip link
 *
 * Adding a product: add one row to PRODUCTS below, run the script, commit.
 * It is safe to run any number of times; a page that is already in sync is
 * left untouched. Blog pages are skipped because scripts/build-blog.mjs lifts
 * its nav from index.html — run `npm run build` afterwards.
 *
 * A page's own nav links (section anchors) and its button are kept as written.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSS_V = 29;
const JS_V = 1;
// Inter is served from this domain (site.css declares the @font-face); the
// preload starts the download with the HTML instead of after the stylesheet.
const FONT_PRELOAD = `<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>`;

// slug, logo, name, one line, accent
const PRODUCTS = [
  ["ripplebug", "/assets/ripplebug-logo.png", "Ripplebug", "Bug reports with the evidence attached", "#22d3ce"],
  ["ripplereach", "/assets/ripplereach-logo.png", "RippleReach", "Remote desktop in tabs, Windows and Mac", "#6574ff"],
  ["ripplesnap", "/assets/ripplesnap-logo.png", "RippleSnap", "Window manager for macOS", "#298cff"],
  ["ripple-import", "/assets/logo.svg", "Ripple Import", "CSV and Excel into monday.com", "#7d66fd"],
  ["ripple-merge", "/assets/ripple-merge-mark.svg", "Ripple Merge", "Mail merge for monday.com emails", "#10b981"],
  ["rippleroot", "/assets/rippleroot-logo.png", "RippleRoot", "Your dev workspace on every machine", "#34d399"],
  ["rippleclip", "/assets/rippleclip-logo.png", "RippleClip", "The capture inbox for iPhone", "#3ecfc0"],
  ["ripple-preview", "/assets/ripple-preview-logo.svg", "Ripple Preview", "Real block previews for Umbraco", "#38bdf8"],
];

const menu = (currentHref, ind) => {
  const rows = PRODUCTS.map(([slug, img, name, line]) =>
    `${ind}    <a href="/${slug}/"${`/${slug}/` === currentHref ? ' aria-current="page"' : ""}><img src="${img}" alt="" width="28" height="28"><span>${name}<small>${line}</small></span></a>`);
  return [
    `${ind}<details class="nav-drop">`,
    `${ind}  <summary class="nav-drop-btn"><span class="nav-drop-label">Products</span><svg class="nav-drop-grid" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.6"/><circle cx="8" cy="3" r="1.6"/><circle cx="13" cy="3" r="1.6"/><circle cx="3" cy="8" r="1.6"/><circle cx="8" cy="8" r="1.6"/><circle cx="13" cy="8" r="1.6"/><circle cx="3" cy="13" r="1.6"/><circle cx="8" cy="13" r="1.6"/><circle cx="13" cy="13" r="1.6"/></svg><svg class="nav-drop-caret" width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></summary>`,
    `${ind}  <div class="nav-drop-menu">`,
    ...rows,
    `${ind}    <div class="nav-drop-foot"><a href="/">All products</a><a href="/blog/">Blog</a><a href="/contact/">Contact</a></div>`,
    `${ind}  </div>`,
    `${ind}</details>`,
  ].join("\n");
};

const companyNav = () => `  <nav class="snav" aria-label="Main">
    <a href="/" class="snav-brand">
      <img src="/assets/coderipple-mark.svg" alt="" width="30" height="30">
      CodeRipple Tech
    </a>
    <div class="snav-links">
${menu(null, "      ")}
      <a href="/blog/">Blog</a>
      <a class="btn btn-ghost" href="/contact/">Contact</a>
    </div>
  </nav>`;

const productNav = (block) => {
  // drop the menu this script wrote last time, so only the page's own links remain
  block = block.replace(/[ \t]*<details class="nav-drop">[^]*?<\/details>\n/, "");
  const main = block.match(/<a class="snav-brand-main" href="([^"]+)">\s*<img src="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/);
  const links = block.match(/<div class="snav-links">\n([^]*?)\n {4}<\/div>\s*<\/nav>/);
  if (!main || !links) return null;
  const [, href, img, name] = main;
  const lines = links[1].split("\n").filter((l) => l.trim());
  // the menu sits after the page's own links, just before its button
  const btnAt = lines.findIndex((l) => /class="btn /.test(l));
  const own = btnAt < 0 ? lines : lines.slice(0, btnAt);
  const btn = btnAt < 0 ? [] : lines.slice(btnAt);
  return `  <nav class="snav" aria-label="Main">
    <div class="snav-brand">
      <a class="snav-by" href="/">CodeRipple Tech</a>
      <span class="snav-sep" aria-hidden="true">/</span>
      <a class="snav-brand-main" href="${href}">
        <img src="${img}" alt="" width="26" height="26">
        ${name}
      </a>
    </div>
    <div class="snav-links">
${[...own, menu(href, "      "), ...btn].join("\n")}
    </div>
  </nav>`;
};

const moreTools = (slug) => {
  const items = PRODUCTS.filter(([s]) => s !== slug).map(([s, img, name, line, c]) =>
    `        <li><a href="/${s}/" style="--c:${c}"><img src="${img}" alt="" width="34" height="34" loading="lazy" decoding="async"><span><b>${name}</b><small>${line}</small></span></a></li>`).join("\n");
  return `  <section class="more-tools" aria-labelledby="more-tools-h">
    <div class="wrap">
      <h2 id="more-tools-h">More from CodeRipple Tech</h2>
      <p>Small tools from the same developer. Each one does a single job.</p>
      <ul class="mt-list">
${items}
      </ul>
    </div>
  </section>

`;
};

const skip = new Set(["node_modules", ".git", "backend", "blog"]);
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) files.push(p);
  }
})(ROOT);

let changed = 0;
for (const file of files) {
  const raw = readFileSync(file, "utf8");
  let html = raw.split("\r\n").join("\n");
  if (!/site\.css\?v=\d+/.test(html)) continue;
  const rel = relative(ROOT, file).split(/[\\/]/);
  const before = html;

  // fonts: self-hosted, preloaded ahead of the stylesheet. Any older Google
  // Fonts links are removed.
  html = html.replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n/g, "")
             .replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n/g, "")
             .replace(/[ \t]*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2[^"]*">\n/g, "")
             .replace(/[ \t]*<link rel="preload" href="\/assets\/fonts\/[^"]*"[^>]*>\n/g, "");
  html = html.replace(/^([ \t]*)(<link rel="stylesheet" href="[^"]*site\.css\?v=\d+">)/m,
    (_, ind, link) => `${ind}${FONT_PRELOAD}\n${ind}${link}`);
  html = html.replace(/site\.css\?v=\d+/g, `site.css?v=${CSS_V}`);

  // shared script
  if (/src="\/site\.js/.test(html)) html = html.replace(/site\.js\?v=\d+/g, `site.js?v=${JS_V}`);
  else html = html.replace(/\n<\/head>/, `\n  <script src="/site.js?v=${JS_V}" defer></script>\n</head>`);

  // skip link + main landmark target
  if (/<main\b/.test(html) && !html.includes('class="skip"')) {
    if (!/<main\b[^>]*\bid=/.test(html)) html = html.replace(/<main\b/, '<main id="main"');
    const id = html.match(/<main\b[^>]*\bid="([^"]+)"/)[1];
    html = html.replace(/<body([^>]*)>\s*\n/, `<body$1>\n  <a class="skip" href="#${id}">Skip to content</a>\n`);
  }

  // navbar
  const nav = html.match(/[ \t]*<nav class="snav"[^>]*>[^]*?<\/nav>/);
  if (nav) {
    const next = /class="snav-brand-main"/.test(nav[0]) ? productNav(nav[0]) : companyNav();
    if (next) html = html.replace(nav[0], () => next);
    else console.warn("  could not read the nav in", rel.join("/"), "— left as it is");
  }

  // the rest of the family, on each product's own page (the folder name is the product)
  const product = PRODUCTS.find(([s]) => s === rel[0]);
  if (product && rel.length === 2 && rel[1] === "index.html") {
    html = html.replace(/ {2}<section class="more-tools"[^]*?<\/section>\n\n/, "");
    const at = html.indexOf('  <footer class="sfooter">');
    if (at > 0) html = html.slice(0, at) + moreTools(rel[0]) + html.slice(at);
  }

  if (html !== before) {
    writeFileSync(file, html);
    console.log("updated", rel.join("/"));
    changed++;
  }
}
console.log(changed ? `${changed} page${changed === 1 ? "" : "s"} updated. Run "npm run build" so the blog picks up the nav.` : "Every page is already in sync.");
