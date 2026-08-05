# DESIGN.md — Writing (the blog)

The design record for `/blog/`. The rest of the site is documented by
[SITE.md](SITE.md); this file covers only what the blog adds.

Surface mode: **Read**. The visitor is here to understand something. Structure
for comprehension first, then make the reading worth staying in.

---

## The world it lives in

The blog invents nothing. It inherits the site's tokens wholesale from
`site.css` — `--bg #0a0e14`, `--card`, `--card-border`, `--text #e8edf4`,
`--muted #93a1b5`, `--radius 14px`, Inter — and defines exactly one new idea:

```css
[data-accent="teal"]   { --shelf: var(--teal);   --shelf-soft: var(--teal-soft); }
[data-accent="purple"] { --shelf: var(--purple); --shelf-soft: var(--purple-soft); }
[data-accent="sky"]    { --shelf: var(--sky);    --shelf-soft: var(--sky-soft); }
```

`--shelf` is "whatever colour this topic is", so a row, a topic label, a link in
the prose, a focus ring and a topic pill can all reference one variable and stay
in agreement. The three colours are the product accents that already mean
something on this site; the blog borrows them rather than inventing a second
colour language.

Nav and footer markup are copied verbatim from `index.html`, including the
products dropdown and its handler. Nothing about the chrome should tell a
visitor they have crossed into a different generator.

---

## The index

**One chronological list, newest first.** Topics are a label on a post, not a
section of the page.

That was the second attempt. The first grouped posts into per-topic "shelves"
of cards, which is a fine idea at forty posts and a bad one at three: every
shelf held a single card, so the page read as three broken grids, and the
strongest post was buried under whichever topic happened to sort first. A blog
index whose job is "what's new" should not hide what's new.

The row:

```
3 August 2026     Self-hosting Convex: the 16 variables an export leaves behind
● Engineering     Three apps, three backends, one Postgres. Moving off Convex…
                  2 min read →
```

- **The date holds its own rail** (132px) so there is one vertical axis to scan.
  The topic sits under it as a coloured dot and label.
- **Hairlines between rows, not boxes around them.** Three boxes in a column
  read as an unfinished grid; three ruled rows read as a table of contents.
- **The newest post gets the size** — `clamp(1.45rem, 3vw, 1.85rem)` against
  `1.24rem` for the rest. Editorial hierarchy without a second component.
- **Hover moves one thing:** a 2px hairline in the topic colour grows down the
  left edge, the row takes a 3.5% white wash, and the arrow slides in. The
  title does not change colour, so nothing flickers as the cursor travels.
- **Below 640px** the rail turns horizontal and sits above the title.

Reading time is computed at 220 wpm and floored at 1.

## The post

720px measure, 1.06rem/1.75 prose, `68ch` cap on paragraphs so long lines never
outrun the eye. The topic accent appears in exactly four places: the pill under
the title, list markers, links, and the focus ring. Everything else is the
site's greys.

Code blocks sit on `#070a0f` — darker than the page, not lighter — with the
language name set small in the top-right corner. Blockquotes are a 1px accent
rule and muted text, no italic and no oversized quote mark.

The byline sits in the meta row between the topic pill and the date, in full
`--text` weight while everything around it is muted — the person's name is the
one thing in that row worth reading twice.

Attribution for a post built on someone else's work (`via_url` / `via_name` in
front matter) renders directly under the meta row, above the fold. Credit that
needs scrolling to find isn't credit.

**The author card** closes every post, before prev/next: a monogram disc, name,
role, two-line bio, and links. The monogram takes the topic accent, so the card
belongs to the post it ends rather than looking bolted on — and it means no
avatar asset to maintain and no broken image to ship. Details come from one
`AUTHOR` object in the generator, so the bio is one edit rather than one per
post.

Prev/next at the foot is two tiles, `NEWER` left and `OLDER` right, collapsing
to one column under 620px.

## Beyond prose

Four containers turn a post into something other than a wall of text.

**Callouts** (`:::note`, `:::fact`, `:::warn`) are a card at the prose measure.
The accent lives in the label and a small dot — the same dot the index uses for
a topic — rather than a coloured bar down one edge, which is the single most
recognisable tell of a generated UI and which the detector correctly flagged on
the first attempt.

**Demos** (`:::demo`) pass raw HTML through, inline `<style>` and `<script>`
included. The rule that keeps them honest: **the static markup must already say
something true**, and the script only animates it. The spinner post's demo runs
two mock players side by side, stalls both for the same 1.4 seconds, and lets
only the one with a pending request show a spinner — with JS off it still reads
as a labelled diagram of the two failure modes.

Demo styling is scoped per post (`sd-` for that one) so blog.css stays general
and two demos can never collide. The shared parts — the frame, the button, the
caption — come from `.bp-demo` so every demo looks like it belongs to the site.

**Tags** close the post above the author card: pills at `--card`, muted, no
links. They exist for the reader's orientation and for `article:tag` /
`keywords`; a tag archive would be a page that mostly doesn't exist yet.

## Motion

One authored moment. The masthead and the first three rows rise 10px into place
on load, staggered 60ms apart; row four onward shares the last delay so a long
archive never becomes a slow cascade. It runs from `both` fill on a
`prefers-reduced-motion: no-preference` guard, so with motion reduced the page
is simply already there. No scroll listeners, no IntersectionObserver, nothing
that can leave content invisible if JS fails.

---

## How a post is made

One Markdown file in `blog/_posts/`, then push. `scripts/build-blog.mjs` runs in
CI ahead of `validate-site.mjs` and regenerates the index, every post page,
`feed.xml`, and the managed blocks in `sitemap.xml` and `llms.txt`. Files
prefixed with `_` are scaffolding and never build.

**Publishing is scheduled, not manual.** A post whose `date` is in the future is
not built; CI runs on a daily cron at 14:00 UTC and picks it up when its date
arrives. So the author writes when they have time, dates the post for a Tuesday,
and is not involved on the day. `--preview` renders the queue locally.

14:00 UTC is 15:00 UK / 10:00 US Eastern / 07:00 US Pacific — the overlap where
a European afternoon, an East Coast mid-morning and a waking West Coast all have
someone reading. The scheduled run skips the deploy entirely when nothing came
due, so a quiet week costs nothing.

Voice and structure are not left to taste: [blog/WRITING.md](blog/WRITING.md)
holds the house style, the pre-publish checklist and the drafting prompt, and
`blog/_posts/_TEMPLATE.md` is the copy-me starting shape.

## SEO, and what the build owns

Per post, generated from front matter and never hand-maintained: canonical URL,
`<meta description>`, OG title/description/URL/image, `twitter:card`, `Article`
JSON-LD with `datePublished`, `dateModified` and a `Person` author carrying
`sameAs` profile links, the RSS item with `dc:creator`, the sitemap entry and the
`llms.txt` line. The index carries `Blog` JSON-LD listing the twenty most recent
posts.

The author is a `Person`, not the `Organization` — that's what lets search
engines and assistants tie this byline to the same human on GitHub and
elsewhere, which is the entire point of publishing under a name.

`summary` is the single string behind the meta description, the OG description,
the RSS description, the index blurb and the `llms.txt` entry — which is why
`WRITING.md` spends a whole section on it.

## Tested

`ALL CLEAR` across 39 page/width combinations (320 → 1920px, three pages) for
horizontal overflow and sub-24px tap targets, plus iPhone 13 and Pixel 7 device
profiles, JavaScript disabled, and `prefers-reduced-motion: reduce`.

Two site-wide bugs surfaced and were fixed rather than worked around:

- The products dropdown is a fixed 264px panel anchored to its button. Under
  ~370px the button sits far enough right that the panel's left edge left the
  screen and the product icons were clipped. Below 420px it now spans the nav
  bar with a gutter. This affected every page on the site, not just the blog.
- Nav and footer links were 21px tall against the WCAG 2.2 24px minimum. Hit
  areas grown with `min-height` and nothing moved visually.

At 320px the brand wordmark, the products control and the CTA stopped fitting on
one row and the CTA clipped. The logo mark alone still identifies the site and
still links home, so the word is what gives way below 360px.

## Known limits

- **No topic filtering.** Deliberate: at three posts a filter bar reading
  "All 3 · Product 1 · Engineering 1 · Tech 1" is furniture. Worth adding
  around a dozen posts, as pills above the list that toggle a `data-topic`
  attribute — every post is already in the DOM, so it degrades to "show all".
- **No per-post OG image.** Posts fall back to `og-home.png`. The front matter
  already accepts `og:`, so a custom image is a one-line change per post.
- **Markdown is a deliberate subset** — headings, paragraphs, lists (including
  wrapped items), blockquote, fenced and inline code, links, bold, italic,
  images, rules. No tables, no footnotes. Small enough to read and trust.
- **Nav link hides below 480px.** The site's nav culls non-CTA links under
  720px; Writing is exempted down to 480px, below which the row genuinely stops
  fitting. The footer link covers that case.
