---
title: Say the specific thing, not the category
date: 2026-01-01
topic: engineering
summary: Two sentences that answer "what will I know after reading this?". This is the search snippet, the RSS description and the index blurb, so it has to work with no page around it.
draft: true
---

<!--
  COPY ME. Rename to your-slug.md — the filename becomes the URL.
  Delete draft: true when it is ready to publish.
  Full house style and the writing prompt: blog/WRITING.md
  Structure below is a starting shape, not a rule. Delete what you do not need.

  Optional front matter:
    tags:     hls, postgres    comma separated; shown on the post, fed to search
    via_url:  https://…        the article this post responds to or builds on
    via_name: Title — Author    how to credit it (renders above the fold)
    author:   Someone Else      only for a guest post; defaults to Dan Negoescu
    og:       my-post-og.png    a custom social image in assets/
    updated:  2026-02-01        if you materially revise it after publishing

  SCHEDULING: set `date` to a future Tuesday or Wednesday and this publishes
  itself on that date at 14:00 UTC. You do not have to be there. Preview the
  queue with: node scripts/build-blog.mjs --preview
-->

Open with the concrete thing that happened. A sentence someone said, a number
that was wrong, a decision you had to make. No preamble about the industry, no
"in this post we will". The reader decides in about three seconds whether this
is for them, so give them the evidence in those three seconds.

Second paragraph: what changed because of it, or what you got wrong. This is
where the reader learns whether the payoff is worth their next four minutes.

## The first real section

One idea per section. Lead with the answer, then explain it — people skim
headings first and read the body second, so the headings alone should tell the
story.

Numbers wherever you have them. "Load average 0.14" and "1.3 GB at 63 MB/s" do
work that "performance was fine" cannot.

```bash
# Real commands, run and copied. Not illustrative pseudo-code.
node scripts/build-blog.mjs
```

:::fact An aside the reader can skip
History, trivia, the thing you looked up at 1am while debugging. This is where
personality lives without derailing the argument. `:::note` and `:::warn` work
the same way.
:::

## The part that surprised you

The most valuable paragraph in most posts is the one where something didn't go
the way you expected. Keep it. That is the part nobody else can write.

- Bullets are for genuinely parallel items, not for chopping up prose.
- Long items can wrap onto the next line — the build folds them back in.

:::demo Something the reader can press
<p>Raw HTML, with scoped inline styles and script. Delete this block unless the
post has something worth showing rather than describing. It must still say
something true with JavaScript switched off.</p>
:::

## What it cost / what I'd do again

End on something usable: the trade-off, the number, the thing you'd change.
Do not end with a summary of what you just said, and do not end on a
call-to-action unless there is a real next step.
