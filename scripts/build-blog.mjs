#!/usr/bin/env node
/**
 * Blog generator — Markdown in, static HTML out.
 *
 * Writing a post is: create blog/_posts/<slug>.md with a small front-matter
 * block, then push. This regenerates the index, every post page, the RSS feed,
 * and the blog's slice of sitemap.xml and llms.txt.
 *
 * Why a build step on a site whose SITE.md says "no build step": the repo
 * already runs Node in CI (validate-site.mjs gates the deploy), so this joins
 * an existing job rather than introducing a toolchain. The OUTPUT is still
 * fully static — no client rendering, no runtime service — which is what
 * keeps the SEO and llms.txt story intact.
 *
 *   node scripts/build-blog.mjs            build
 *   node scripts/build-blog.mjs --preview  include future-dated posts (local only)
 *   node scripts/build-blog.mjs --check    fail if output is stale
 *
 * Scheduled publishing: a post whose `date` is in the future is not built. CI
 * runs this on every push AND on a daily cron, so dating a post next Tuesday
 * publishes it next Tuesday without anyone being at a keyboard.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = join(ROOT, "blog", "_posts");
const OUT_DIR = join(ROOT, "blog");
const SITE = "https://coderippletech.com";
const CHECK = process.argv.includes("--check");
const PREVIEW = process.argv.includes("--preview");
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------------------------------------------------------------------------
 * Topics. The accent variables already exist in site.css and already mean
 * something on this site, so the blog inherits them rather than inventing a
 * second colour language. A topic is a label on a post, not a section of the
 * index — the index stays chronological, because that is the order a reader
 * of a blog actually wants.
 * ------------------------------------------------------------------------- */
const TOPICS = {
  product: { label: "Product", accent: "teal" },
  engineering: { label: "Engineering", accent: "purple" },
  tech: { label: "Tech", accent: "sky" },
};
const DEFAULT_TOPIC = "tech";

/* ---------------------------------------------------------------------------
 * The author. Posts are written by a person, not by a company — the byline, the
 * card at the foot of every post and the Person JSON-LD all come from here, so
 * changing a link or the bio is one edit rather than one per post.
 *
 * `sameAs` is how search engines and assistants connect this byline to the same
 * human elsewhere. Only add profiles that genuinely exist and are public.
 * ------------------------------------------------------------------------- */
const AUTHOR = {
  name: "Dan Negoescu",
  initials: "DN",
  role: "Software engineer · founder, CodeRipple Tech",
  bio: "I build small developer tools and self-host almost everything that runs them. Most of what I write here started as something that broke on a Tuesday.",
  sameAs: [
    "https://github.com/negoescg",
    "https://github.com/coderippletech",
    "https://app.daily.dev/squads/rippleeffect",
  ],
  links: [
    { label: "GitHub", href: "https://github.com/negoescg" },
    { label: "Ripple Effect on daily.dev", href: "https://app.daily.dev/squads/rippleeffect" },
    { label: "CodeRipple Tech", href: "/" },
    { label: "RSS", href: "/blog/feed.xml" },
  ],
};

/* --------------------------------------------------------------- utilities */

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Reading time from word count. Rounded up, floored at 1. */
const readingTime = (text) =>
  Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));

/* -------------------------------------------------------- front matter + md */

function parseFrontMatter(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing --- front matter block at the top`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const i = line.indexOf(":");
    if (i === -1) throw new Error(`${file}: front-matter line is not key: value -> "${line}"`);
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    meta[line.slice(0, i).trim()] = v;
  }
  return { meta, body: m[2] };
}

/**
 * Small, deliberate Markdown subset: headings, paragraphs, lists, blockquote,
 * fenced and inline code, links, bold/italic, images, hr. Enough for real
 * writing, small enough to read and trust. Fenced code is extracted first so
 * inline rules never touch its contents.
 */
function markdown(src) {
  const fences = [];

  // Lift fenced code out first so the inline rules below can never rewrite
  // anything inside a code block.
  let s = src.replace(/\r\n/g, "\n").replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    fences.push(
      `<pre class="bp-code"${lang ? ` data-lang="${esc(lang)}"` : ""}><code>${esc(code.replace(/\n$/, ""))}</code></pre>`
    );
    return `@@FENCE${fences.length - 1}@@`;
  });

  const inline = (t) =>
    t
      .replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src2) =>
        `<img src="${esc(src2)}" alt="${esc(alt)}" loading="lazy" decoding="async">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) => {
        const ext = /^https?:\/\//.test(href) && !href.includes("coderippletech.com");
        return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  const out = [];
  const lines = s.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (/^@@FENCE\d+@@$/.test(line.trim())) { out.push(line.trim()); i++; continue; }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length + 1;              // # in a post is an <h2>; <h1> is the title
      const text = inline(h[2].trim());
      const id = slugify(h[2].trim());
      out.push(`<h${lvl} id="${id}">${text}</h${lvl}>`);
      i++; continue;
    }

    if (/^(---|\*\*\*)\s*$/.test(line)) { out.push("<hr>"); i++; continue; }

    /* Containers: `:::note`, `:::fact Optional title`, `:::warn`, `:::demo`,
       closed by a bare `:::`. A post is allowed to be more than prose — an
       aside the reader can skip, or a thing they can actually poke at.
       `demo` passes its body through as raw HTML, because the only person
       writing these files is the person who owns the site. */
    const open = line.match(/^:::(note|fact|warn|demo)\s*(.*)$/);
    if (open) {
      const [, kind, rawLabel] = open;
      const buf = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") { buf.push(lines[i]); i++; }
      i++;                                            // consume the closing :::
      if (kind === "demo") {
        out.push(`<figure class="bp-demo"${rawLabel ? ` data-label="${esc(rawLabel)}"` : ""}>${buf.join("\n")}</figure>`);
      } else {
        const label = rawLabel || { note: "Note", fact: "Fun fact", warn: "Careful" }[kind];
        const paras = buf.join("\n").split(/\n\s*\n/).filter((p) => p.trim())
          .map((p) => `<p>${inline(p.trim().split("\n").join(" "))}</p>`).join("");
        out.push(`<aside class="bp-call bp-call--${kind}">` +
                 `<p class="bp-call-label">${esc(label)}</p>${paras}</aside>`);
      }
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Lists. A wrapped item — a continuation line indented under its bullet —
    // folds back into that item. Without this, hard-wrapping a long bullet
    // silently ejects the tail of it into a paragraph after the list.
    const list = (marker, tag) => {
      const items = [];
      while (i < lines.length) {
        const m2 = lines[i].match(marker);
        if (m2) { items.push(m2[1]); i++; continue; }
        if (items.length && /^\s+\S/.test(lines[i]) && !/^\s*(#{1,4}\s|>)/.test(lines[i])
            && !/^ FENCE\d+ $/.test(lines[i].trim())) {
          items[items.length - 1] += " " + lines[i].trim(); i++; continue;
        }
        break;
      }
      out.push(`<${tag}>${items.map((b) => `<li>${inline(b)}</li>`).join("")}</${tag}>`);
    };

    if (/^[-*]\s+/.test(line)) { list(/^[-*]\s+(.*)$/, "ul"); continue; }
    if (/^\d+\.\s+/.test(line)) { list(/^\d+\.\s+(.*)$/, "ol"); continue; }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|[-*]\s|\d+\.\s|---|\*\*\*|:::)/.test(lines[i])
           && !/^@@FENCE\d+@@$/.test(lines[i].trim())) {
      para.push(lines[i]); i++;
    }
    if (para.length) out.push(`<p>${inline(para.join(" ").trim())}</p>`);
  }

  return out.join("\n").replace(/@@FENCE(\d+)@@/g, (_, n) => fences[Number(n)]);
}

/* ------------------------------------------------------------------ chrome */

/**
 * The nav and footer are LIFTED FROM index.html at build time rather than
 * copied into this file.
 *
 * They were copied once, and within a fortnight the site had gained two
 * products that the blog's hardcoded dropdown and footer knew nothing about.
 * Reading the real markup means the blog cannot drift: ship a product, update
 * the homepage as usual, and the blog's chrome follows on the next build.
 *
 * index.html links its own assets relatively (`./`, `assets/logo.svg`) because
 * it sits at the site root. Blog pages are one and two levels down, so every
 * relative reference is made absolute on the way through.
 */
function siteChrome() {
  const src = readFileSync(join(ROOT, "index.html"), "utf8");

  const grab = (re, what) => {
    const m = src.match(re);
    if (!m) throw new Error(`could not find the ${what} in index.html — the blog lifts its chrome from there`);
    return m[0];
  };

  const absolute = (html) =>
    html
      .replace(/(href|src)="\.\/"/g, '$1="/"')
      .replace(/(href|src)="(?!\/|https?:|mailto:|tel:|#|data:)/g, '$1="/');

  let nav = absolute(grab(/<nav class="snav">[\s\S]*?<\/nav>/, "<nav class=\"snav\">"));
  let footer = absolute(grab(/<footer class="sfooter">[\s\S]*?<\/footer>/, "<footer class=\"sfooter\">"));

  // The blog is a top-level destination, so it sits beside the CTA rather than
  // inside the products menu. Injected here so the homepage keeps one copy of
  // the markup and the blog does not have to be edited when it changes.
  if (!/href="\/blog\/"/.test(nav)) {
    nav = nav.replace(/(\s*)<a class="btn[^"]*" href="\/contact\/">/,
                      '$1<a href="/blog/">Blog</a>$1<a class="btn btn-ghost" href="/contact/">');
  }
  if (!/href="\/blog\/"/.test(footer)) {
    footer = footer.replace(/(<h4>Support<\/h4>\s*\n(\s*)<a href="\/contact\/">Contact<\/a>)/,
                            '$1\n$2<a href="/blog/">Blog</a>\n$2<a href="/blog/feed.xml">RSS feed</a>');
  }

  return { nav, footer };
}

const CHROME = siteChrome();
const NAV = (here = false) =>
  here ? CHROME.nav.replace('<a href="/blog/">', '<a href="/blog/" aria-current="page">')
       : CHROME.nav;
const FOOTER = CHROME.footer;

/* The products dropdown is behaviour that lives in each page's inline script on
   this site; the blog carries the same handler so the nav is not decorative. */
const NAV_JS = `<script>
    (() => {
      const drop = document.querySelector(".nav-drop");
      if (!drop) return;
      const btn = drop.querySelector(".nav-drop-btn");
      const close = () => { drop.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); };
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        btn.setAttribute("aria-expanded", String(drop.classList.toggle("open")));
      });
      document.addEventListener("click", (e) => { if (!drop.contains(e.target)) close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    })();
  </script>`;

const head = ({ title, desc, url, og, article = null, extra = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="CodeRipple Tech">
<meta property="og:locale" content="en_GB">
<meta property="og:type" content="${article ? "article" : "website"}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/assets/${og}">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">${article ? `
<meta property="article:published_time" content="${article.date}T09:00:00Z">
<meta property="article:modified_time" content="${article.updated || article.date}T09:00:00Z">
<meta property="article:author" content="${esc(article.author)}">
<meta property="article:section" content="${esc(article.section)}">${article.tags.map((t) =>
`\n<meta property="article:tag" content="${esc(t)}">`).join("")}
<meta name="author" content="${esc(article.author)}">
<link rel="author" href="${AUTHOR.sameAs[0]}">` : ""}
<link rel="alternate" type="application/rss+xml" title="CodeRipple Tech — Blog" href="${SITE}/blog/feed.xml">
<link rel="icon" href="/assets/logo.svg">
<link rel="stylesheet" href="/site.css?v=18">
<link rel="stylesheet" href="/blog/blog.css?v=7">
${extra}
</head>`;

/* ------------------------------------------------------------------- build */

function loadPosts() {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR)
    // _TEMPLATE.md and anything else prefixed with _ is scaffolding, not a post.
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((file) => {
      const raw = readFileSync(join(POSTS_DIR, file), "utf8");
      const { meta, body } = parseFrontMatter(raw, file);
      for (const req of ["title", "date", "summary"]) {
        if (!meta[req]) throw new Error(`${file}: front matter is missing "${req}"`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
        throw new Error(`${file}: date must be YYYY-MM-DD, got "${meta.date}"`);
      }
      const topic = (meta.topic || DEFAULT_TOPIC).toLowerCase();
      if (!TOPICS[topic]) {
        throw new Error(`${file}: unknown topic "${topic}". Use one of: ${Object.keys(TOPICS).join(", ")}`);
      }
      const slug = meta.slug || file.replace(/\.md$/, "");
      return {
        ...meta, topic, slug, body,
        html: markdown(body),
        minutes: readingTime(body),
        words: body.trim().split(/\s+/).length,
        tags: (meta.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
        url: `${SITE}/blog/${slug}/`,
        draft: String(meta.draft || "").toLowerCase() === "true",
        scheduled: meta.date > TODAY,
      };
    })
    // A draft is unfinished. A scheduled post is finished and waiting for its
    // slot — CI runs on a daily cron, so it goes live on its own date without
    // anyone being at a keyboard. --preview shows both locally.
    .filter((p) => PREVIEW || (!p.draft && !p.scheduled))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function renderIndex(posts) {
  /* One chronological list. The date sits in its own rail so the eye has a
     single vertical axis to scan, and the topic rides beside it as a coloured
     label rather than splitting the page into sections — grouping by topic
     buries the newest post and looks broken until there are dozens. */
  const rows = posts.map((p) => `
        <li class="bp-row" data-accent="${TOPICS[p.topic].accent}">
          <a class="bp-row-link" href="/blog/${p.slug}/">
            <div class="bp-row-rail">
              <time datetime="${p.date}">${fmtDate(p.date)}</time>
              <span class="bp-row-topic">${TOPICS[p.topic].label}</span>
            </div>
            <div class="bp-row-body">
              <h2 class="bp-row-title">${esc(p.title)}</h2>
              <p class="bp-row-summary">${esc(p.summary)}</p>
              <span class="bp-row-more">
                ${p.minutes} min read
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7"/></svg>
              </span>
            </div>
          </a>
        </li>`).join("");

  const list = `
      <ol class="bp-list">${rows}
      </ol>`;

  const empty = `
      <section class="bp-empty">
        <h2>Nothing published yet</h2>
        <p>The first post is being written. In the meantime, the products are
           where the work shows up — start with <a href="/rippleroot/">RippleRoot</a>.</p>
      </section>`;

  const jsonld = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "Blog",
    name: "CodeRipple Tech — Blog", url: `${SITE}/blog/`,
    description: "Working notes from building CodeRipple Tech: what shipped, what broke, and what the numbers actually said.",
    publisher: { "@type": "Organization", name: "CodeRipple Tech", url: SITE },
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting", headline: p.title, url: p.url, datePublished: p.date, description: p.summary,
    })),
  })}</script>`;

  return `${head({
    title: "Blog — CodeRipple Tech",
    desc: "Working notes from building CodeRipple Tech: what shipped, what broke, and what the numbers actually said.",
    url: `${SITE}/blog/`, og: "og-home.png", extra: jsonld,
  })}
<body>
  ${NAV(true)}
  <main class="bp-main">
    <header class="bp-masthead">
      <h1>Blog</h1>
      <p>Working notes from building CodeRipple Tech — what shipped, what broke,
         and what the numbers actually said.</p>
      <a class="bp-feed" href="/blog/feed.xml">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.4" fill="currentColor" stroke="none"/>
        </svg>
        RSS
      </a>
    </header>
    ${posts.length ? list : empty}
  </main>
  ${FOOTER}
  ${NAV_JS}
</body>
</html>
`;
}

function renderPost(post, prev, next) {
  const t = TOPICS[post.topic];

  /* Two graphs, one script tag. The Article tells a crawler what this page is;
     the BreadcrumbList tells it where the page sits, which is what produces the
     "coderippletech.com › Blog › …" line in a result rather than a bare URL. */
  const jsonld = `<script type="application/ld+json">${JSON.stringify([{
    "@context": "https://schema.org", "@type": "BlogPosting",
    headline: post.title, description: post.summary, abstract: post.summary,
    datePublished: `${post.date}T09:00:00Z`,
    dateModified: `${post.updated || post.date}T09:00:00Z`,
    mainEntityOfPage: { "@type": "WebPage", "@id": post.url },
    url: post.url, inLanguage: "en-GB",
    wordCount: post.words, timeRequired: `PT${post.minutes}M`,
    articleSection: t.label,
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
    image: `${SITE}/assets/${post.og || "og-home.png"}`,
    author: {
      "@type": "Person", name: AUTHOR.name, jobTitle: AUTHOR.role,
      description: AUTHOR.bio, url: `${SITE}/blog/`, sameAs: AUTHOR.sameAs,
    },
    publisher: { "@type": "Organization", name: "CodeRipple Tech", url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/assets/logo.svg` } },
    ...(post.via_url ? { citation: { "@type": "CreativeWork", url: post.via_url,
      ...(post.via_name ? { name: post.via_name } : {}) } } : {}),
  }, {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "CodeRipple Tech", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog/` },
      { "@type": "ListItem", position: 3, name: post.title, item: post.url },
    ],
  }])}</script>`;

  const crumbs = `
      <nav class="bp-crumbs" aria-label="Breadcrumb">
        <a href="/">CodeRipple Tech</a>
        <span aria-hidden="true">/</span>
        <a href="/blog/">Blog</a>
      </nav>`;

  const tagList = post.tags.length ? `
      <ul class="bp-tags" aria-label="Topics">${post.tags.map((tg) =>
        `<li>${esc(tg)}</li>`).join("")}
      </ul>` : "";

  /* Attribution for a post that responds to, summarises or builds on someone
     else's work. Credit belongs above the fold, not in a footnote. */
  const via = post.via_url ? `
      <p class="bp-via">Via
        <a href="${esc(post.via_url)}" target="_blank" rel="noopener">${esc(post.via_name || post.via_url)}</a>
      </p>` : "";

  const authorCard = `
    <aside class="bp-author">
      <span class="bp-author-mark" aria-hidden="true">${esc(AUTHOR.initials)}</span>
      <div class="bp-author-body">
        <p class="bp-author-name">${esc(AUTHOR.name)}</p>
        <p class="bp-author-role">${esc(AUTHOR.role)}</p>
        <p class="bp-author-bio">${esc(AUTHOR.bio)}</p>
        <p class="bp-author-links">${AUTHOR.links.map((l) =>
          `<a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ""}>${esc(l.label)}</a>`
        ).join("")}</p>
      </div>
    </aside>`;

  const nav = (prev || next) ? `
    <nav class="bp-adjacent" aria-label="More posts">
      ${prev ? `<a class="bp-adjacent-link" href="/blog/${prev.slug}/">
        <span class="bp-adjacent-dir">Newer</span>
        <span class="bp-adjacent-title">${esc(prev.title)}</span></a>` : "<span></span>"}
      ${next ? `<a class="bp-adjacent-link bp-adjacent-link--next" href="/blog/${next.slug}/">
        <span class="bp-adjacent-dir">Older</span>
        <span class="bp-adjacent-title">${esc(next.title)}</span></a>` : "<span></span>"}
    </nav>` : "";

  return `${head({
    title: `${post.title} — CodeRipple Tech`,
    desc: post.summary,
    url: post.url,
    og: post.og || "og-home.png",
    article: {
      date: post.date, updated: post.updated,
      author: post.author || AUTHOR.name, section: t.label, tags: post.tags,
    },
    extra: jsonld,
  })}
<body class="bp-post-body" data-accent="${t.accent}">
  ${NAV()}
  <article class="bp-post">
    <header class="bp-post-head">${crumbs}
      <h1>${esc(post.title)}</h1>
      <p class="bp-post-summary">${esc(post.summary)}</p>
      <div class="bp-post-meta">
        <span class="bp-topic">${t.label}</span>
        <span class="bp-byline" rel="author">${esc(post.author || AUTHOR.name)}</span>
        <span aria-hidden="true">&middot;</span>
        <time datetime="${post.date}">${fmtDate(post.date)}</time>
        <span aria-hidden="true">&middot;</span>
        <span>${post.minutes} min read</span>
      </div>${via}
    </header>
    <div class="bp-prose">
${post.html}
    </div>${tagList}
    ${authorCard}
    ${nav}
  </article>
  ${FOOTER}
  ${NAV_JS}
</body>
</html>
`;
}

function renderFeed(posts) {
  /* Full text in content:encoded, not a teaser. Readers, aggregators and the
     crawlers that feed AI answers all take what the feed gives them; a feed of
     summaries teaches them the posts are thin. Relative URLs are absolutised so
     the post still works when it is read somewhere else entirely. */
  const absolute = (html) =>
    html.replace(/(href|src)="\/([^"]*)"/g, `$1="${SITE}/$2"`);

  const items = posts.slice(0, 30).map((p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${p.url}</link>
    <guid isPermaLink="true">${p.url}</guid>
    <pubDate>${new Date(p.date + "T09:00:00Z").toUTCString()}</pubDate>
    <dc:creator>${esc(p.author || AUTHOR.name)}</dc:creator>
    <description>${esc(p.summary)}</description>
    <content:encoded><![CDATA[${absolute(p.html).replace(/\]\]>/g, "]]&gt;")}]]></content:encoded>
    <category>${esc(TOPICS[p.topic].label)}</category>${p.tags.map((tg) =>
    `\n    <category>${esc(tg)}</category>`).join("")}
  </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>CodeRipple Tech — Blog</title>
  <link>${SITE}/blog/</link>
  <atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Working notes from building CodeRipple Tech — what shipped, what broke, and what the numbers actually said.</description>
  <language>en-GB</language>
  <managingEditor>support@coderippletech.com (${AUTHOR.name})</managingEditor>
${items}
</channel>
</rss>
`;
}

/* --------------------------------------------------- sitemap.xml + llms.txt */

function updateSitemap(posts) {
  const file = join(ROOT, "sitemap.xml");
  if (!existsSync(file)) return "sitemap.xml not found — skipped";
  let xml = readFileSync(file, "utf8");
  // Managed block so regeneration never duplicates or clobbers hand-written entries.
  const block = [`  <!-- blog:start -->`,
    `  <url><loc>${SITE}/blog/</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`,
    ...posts.map((p) => `  <url><loc>${p.url}</loc><lastmod>${p.updated || p.date}</lastmod><priority>0.6</priority></url>`),
    `  <!-- blog:end -->`].join("\n");

  xml = /<!-- blog:start -->[\s\S]*?<!-- blog:end -->/.test(xml)
    ? xml.replace(/[ \t]*<!-- blog:start -->[\s\S]*?<!-- blog:end -->/, block)
    : xml.replace(/<\/urlset>/, `${block}\n</urlset>`);
  writeFileSync(file, xml);
  return `sitemap.xml — ${posts.length + 1} blog entries`;
}

function updateLlms(posts) {
  const file = join(ROOT, "llms.txt");
  if (!existsSync(file)) return "llms.txt not found — skipped";
  let txt = readFileSync(file, "utf8");
  const block = ["<!-- blog:start -->", "", "## Blog", "",
    `- [Blog](${SITE}/blog/): working notes on the products, the engineering behind them, and the wider craft.`,
    ...posts.map((p) => `- [${p.title}](${p.url}): ${p.summary}`),
    "", "<!-- blog:end -->"].join("\n");

  txt = /<!-- blog:start -->[\s\S]*?<!-- blog:end -->/.test(txt)
    ? txt.replace(/<!-- blog:start -->[\s\S]*?<!-- blog:end -->/, block)
    : txt.trimEnd() + "\n\n" + block + "\n";
  writeFileSync(file, txt);
  return `llms.txt — ${posts.length} posts listed`;
}

/* -------------------------------------------------------------------- main */

try {
  const posts = loadPosts();
  const written = [];

  const files = new Map();
  files.set(join(OUT_DIR, "index.html"), renderIndex(posts));
  files.set(join(OUT_DIR, "feed.xml"), renderFeed(posts));
  posts.forEach((p, i) => {
    files.set(join(OUT_DIR, p.slug, "index.html"),
              renderPost(p, posts[i - 1], posts[i + 1]));
  });

  if (CHECK) {
    let stale = [];
    for (const [path, content] of files) {
      if (!existsSync(path) || readFileSync(path, "utf8") !== content) stale.push(path);
    }
    if (stale.length) {
      console.error("Blog output is stale. Run: node scripts/build-blog.mjs");
      stale.forEach((s) => console.error("  " + s.replace(ROOT, "")));
      process.exit(1);
    }
    console.log(`Blog output up to date (${posts.length} posts).`);
    process.exit(0);
  }

  // Drop generated post directories that no longer have a source file.
  if (existsSync(OUT_DIR)) {
    for (const entry of readdirSync(OUT_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "_posts") continue;
      if (!posts.some((p) => p.slug === entry.name)) {
        rmSync(join(OUT_DIR, entry.name), { recursive: true, force: true });
        written.push(`removed /blog/${entry.name}/ (no source)`);
      }
    }
  }

  for (const [path, content] of files) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    written.push(path.replace(ROOT, "").replace(/\\/g, "/"));
  }

  console.log(`Built ${posts.length} post${posts.length === 1 ? "" : "s"}:`);
  written.forEach((w) => console.log("  " + w));
  console.log("  " + updateSitemap(posts));
  console.log("  " + updateLlms(posts));
} catch (err) {
  console.error("Blog build failed:", err.message);
  process.exit(1);
}
