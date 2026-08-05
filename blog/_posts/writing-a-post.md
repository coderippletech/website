---
title: How this blog works
date: 2026-08-01
topic: product
summary: One Markdown file and a push. The index, the RSS feed, the sitemap and llms.txt all regenerate themselves, and a broken link fails the build instead of shipping.
---

There's no CMS here, no database, no runtime. Every page you're reading is a
static file that got written at deploy time. Here's the whole system.

## Writing a post

Make one file in `blog/_posts/`:

```markdown
---
title: The thing I want to say
date: 2026-08-14
topic: engineering
summary: One or two sentences. This shows on the index and in search results.
---

Write the post here in Markdown.
```

Then push. That's the workflow.

`title`, `date` and `summary` are required. `topic` is one of `product`,
`engineering` or `tech`, and it decides which accent colour the post carries.
Add `draft: true` to keep something out of the build while you're still working
on it.

There's a `_TEMPLATE.md` next to the posts with the front matter already filled
in and the house rules in comments, so starting a post is a copy rather than a
blank page.

## What happens on push

GitHub Actions runs `scripts/build-blog.mjs`, which:

- renders every post to static HTML;
- rebuilds the index, newest first;
- writes `feed.xml` so the blog works in a reader;
- updates the blog's block in `sitemap.xml` and `llms.txt`;
- deletes generated pages whose source file has gone.

Then `validate-site.mjs` checks that nothing points at a missing asset or route,
and only after that does Cloudflare Pages get the deploy. A broken link fails
the build rather than shipping.

## Why there's a build step at all

The rest of this site has no build step, on purpose. Pages are hand-written
HTML. A blog is where that rule stops paying for itself.

Hand-writing each post means editing three or four files every time: the post,
the index, the sitemap, the feed. That decays fast. It's the reason so many
company blogs have four posts and a last-updated date from two years ago.

The trade here is that the *output* stays exactly as static as everything else.
No client-side rendering, no service to go down. A crawler and a reader both get
finished HTML. The build step buys authoring convenience and spends nothing that
mattered.

## Two bits worth stealing

**Managed blocks in shared files.** The generator only writes between
`<!-- blog:start -->` and `<!-- blog:end -->` markers in `sitemap.xml` and
`llms.txt`. It never rewrites those files wholesale, so hand-written entries
elsewhere in them survive every regeneration.

**Deleting orphans.** If a source file disappears, its generated directory goes
with it. Otherwise unpublishing something leaves a live page that nothing links
to and everything still indexes.
