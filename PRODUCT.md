# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS, no framework, deployed to Cloudflare Pages (project
`coderipple-site`) on every push to `main` via GitHub Actions.

**Blog authoring — delegated.** The user asked for "the best option with best
practices and the best UI" rather than choosing. Chosen: **Markdown source
files plus a small Node build step** that renders static HTML at deploy time.

Why this over the alternatives:

- The existing site rule is "no build step", and this bends it — but the repo
  already runs Node in CI (`scripts/validate-site.mjs` gates the deploy), so
  this adds a step to an existing job rather than introducing a toolchain.
- Output stays 100% static: no runtime dependency, no client-side rendering,
  so search engines and `llms.txt` consumers see complete HTML. This matters
  because SEO is an explicit priority here.
- Hand-written HTML per post (the `_template/product/` pattern) was the other
  serious candidate. Rejected because every post would mean editing 3–4 files
  and hand-maintaining the index, sitemap and RSS — which decays fast and is
  the usual reason a blog dies after four posts.
- Storing posts in the self-hosted Convex instance was rejected: it would make
  the marketing site depend on a runtime service and lose static SEO.

**Voice — not left to taste.** The user's requirement was that the writing read
human rather than machine-generated. `blog/WRITING.md` holds the house style,
the banned-phrase list, the pre-publish checklist and the drafting prompt;
`blog/_posts/_TEMPLATE.md` is the copy-me starting shape. Treat both as part of
the product, not documentation about it — a post that fails the checklist in
`WRITING.md` should not ship.

**Publishing is automated; writing is not.** The user asked for the whole thing
to run automatically. Publishing does: a future-dated post is held back and CI's
daily 14:00 UTC cron puts it live on its date with nobody present. Drafting does
not, and deliberately so — the blog is published under a personal byline to
build a personal following, and auto-publishing generated posts under that name
destroys exactly the thing it is meant to build. The server's daily `radar` job
goes as far as proposing angles from real news; a human writes and approves.

**Author identity.** Posts are bylined **Dan Negoescu**, with `Person` JSON-LD
carrying `sameAs` links so search engines and assistants tie the byline to the
same human elsewhere. The `AUTHOR` object at the top of `scripts/build-blog.mjs`
is the single source; adding a LinkedIn or daily.dev profile is one edit.

## Users

Developers and technically-minded ops people. They arrive from search, from a
product page, or from a link, and they are reading to understand something —
how a thing works, why a decision was made, or what changed in a product.

Secondary: prospective users evaluating whether CodeRipple Tech builds things
worth trusting. The blog is evidence of craft, not a sales channel.

## Product Purpose

CodeRipple Tech builds "small tools, big ripples" — sharp, focused products
that remove friction from everyday dev and ops work: Ripplebug (bug
reporting), Ripple Import (monday.com data import), Ripple Preview (Umbraco
package), RippleRoot (workspace control plane), RippleSnap.

The blog exists to publish writing that is either product-related or general
technology and coding material. The user was explicit that it is not limited
to product news: "it can be anything really, either product related but maybe
just tech news, coding etc."

## Operating Context

- Static site at coderippletech.com; product pages live at `/<slug>/`.
- `_template/product/` is a copy-me skeleton for new product pages; the blog
  should follow the same "copy the template" spirit for authors.
- `site.css` is the shared design system, cache-busted as `site.css?v=N`.
- `scripts/validate-site.mjs` checks every page and sitemap entry for missing
  same-site assets and routes; the deploy stops if it fails.
- Root files `monday-app-association.json`, `privacy.html`, `terms.html` and
  `guide.html` must never move — the monday.com marketplace links to them.

## Capabilities and Constraints

- No framework, no client-side routing, no runtime service for the site.
- Content must degrade to readable HTML without JavaScript.
- SEO is a first-class requirement: `sitemap.xml`, `llms.txt`, OG images,
  canonical URLs and JSON-LD are already maintained per page and the blog must
  extend all of them rather than sit outside.
- Posting cadence is undecided. The design must not look broken or empty at
  three posts, nor become unusable at fifty.

## Brand Commitments

- Name and wordmark: CodeRipple Tech. Tagline "Small tools. Big ripples."
- Existing design system in `site.css`: dark ground (`--bg #0a0e14`), Inter,
  card surfaces at `rgba(255,255,255,0.03)` with `0.08` borders, text
  `#e8edf4` / muted `#93a1b5`, `--radius: 14px`, sticky `.snav` navigation.
- Per-product accent colours are already assigned and meaningful: teal
  `#22d3ce` (Ripplebug), purple `#7d66fd` (Ripple Import), sky `#38bdf8`
  (Ripple Preview). The blog must respect these rather than invent new ones.
- Logos and OG images live in `assets/`.

## Evidence on Hand

- Live site and product pages as written copy and voice reference.
- `SITE.md` documents the site's own conventions in the maintainer's words.
- GitHub organisation `coderippletech` is public and linked from the footer.
