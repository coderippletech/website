# Writing for CodeRipple Tech

House style, the checklist, and the prompt to hand an AI when you want a draft.

The blog exists for one reason: people follow a person who shows their working.
A post that says what actually happened — with the numbers, including the parts
that went badly — is worth more than ten posts of category-level advice, and it
is the only kind of post nobody else can copy.

Everything below is downstream of that.

## Who is writing

Dan Negoescu. Not "CodeRipple Tech", not "the team", not "we at". The byline,
the author card and the `Person` schema on every post all say so, and the prose
has to match: **"I"** for the work, **"we"** only when the sentence is genuinely
about the company deciding something.

That's the whole personal-brand strategy. People do not subscribe to a company
changelog. They subscribe to a person who keeps being useful and keeps being
honest about what went wrong, and after a year of that they know your name.

Practically, that means:

- Say what you thought would happen and what actually happened.
- Keep the embarrassing bit. "I checked anyway. Twice." is the sentence people
  remember, because everybody has done it.
- One reader, not an audience. Write as if explaining it to one developer you
  respect, over a coffee, who will interrupt if you waffle.
- No authority voice. You're not lecturing from a stage — you're showing
  someone what you found. "Here's what bit me" beats "here are 5 best practices
  for X".

Where the author details live: the `AUTHOR` block at the top of
`scripts/build-blog.mjs`. Name, role, bio, links, and the `sameAs` profiles that
tell search engines and assistants that this byline is the same human as the
GitHub account. Add LinkedIn, X or a daily.dev profile there when you want them
connected — one edit, every post updates.

---

## 1. Pick a post that can be written by us and nobody else

Good candidates, in rough order of value:

| Kind | Example |
|---|---|
| A failure with a real diagnosis | "The bug with no spinner" |
| A migration with numbers attached | "Self-hosting Convex: the 16 variables an export leaves behind" |
| A decision and its trade-off | why the site has no build step but the blog does |
| A teardown of how something works | the release pipeline, end to end |
| A shipped feature, told as a problem | not "introducing X", but "X existed because Y kept happening" |

Bad candidates: anything that could be written by someone who has never used
our software. "10 tips for better debugging". "Why observability matters".
Those posts have no author.

### Writing about someone else's work

Reacting to an article, a release or a thread is fine and often the easiest post
to write — but only if you add something they didn't. A summary of someone
else's post is not a post. What makes it yours is the sentence "here's what
happened when I tried it", or "this is the bit they got wrong", or "we hit this
exact problem and solved it differently".

Credit goes in the front matter, and it renders above the fold:

```markdown
via_url: https://example.com/the-original-article
via_name: Their Post Title — Author
```

If you're quoting, quote briefly and link. Never reproduce someone's article
whole, and never let a reader finish yours unsure whose idea was whose.

The daily digest on the server (`radar`, or `/info/radar/` on the tailnet) exists
to feed this: it reads the daily.dev firehose every morning and proposes angles
where you already have first-hand material. Angles from it are suggestions, not
assignments — if you don't have the material, don't write the post.

The bar to clear before writing: **what in this post could only come from us?**
If the answer is nothing, the post isn't ready.

Front-page-worthy technical posts tend to be write-ups people can argue with,
test, or correct — lessons, surprising failures, trade-offs, benchmarks,
teardowns — rather than announcements. That's the target.

---

## 2. Titles

The title does two jobs: say who it's for, and say what's specific about it.

**Use the real nouns.** A developer scanning a list decides relevance from the
jargon. `Convex`, `HLS`, `Postgres`, `monday.com` are signals. "Our recent
infrastructure journey" is noise.

**Put the specific detail in.** Concrete digits, versions and time-boxed results
outperform their vague equivalents. "the 16 variables an export leaves behind"
beats "what I learned migrating". "The bug with no spinner" beats "debugging a
streaming issue".

**Length: aim for 6–12 words.** Long enough to be specific, short enough to
survive a search result.

A pattern that works well: `[specific thing]: [the surprising part]`.

Things to never do:

- Curiosity gaps with no content. "You won't believe what broke."
- `How to X in 2026` unless the year genuinely matters.
- `The Ultimate Guide to…`, `Everything you need to know about…`.
- Title Case Everywhere. Sentence case, like the rest of the site.

---

## 3. The summary

The `summary` in front matter is the hardest-working sentence you'll write. It
is the index blurb, the RSS description, the `<meta description>`, the OG
description, and the line in `llms.txt`. It appears with no page around it.

Rules:

- Two sentences, 25–40 words.
- Answer "what will I know after reading this?", not "what is this about?".
- Lead with the answer, not the setup. Assistants and search engines weight the
  opening of a page heavily when deciding what it says and whether to cite it —
  a summary that withholds the point gets summarised into nothing.
- No "In this post…", no "We explore…".

Good: *Three apps, three backends, one Postgres. Moving off Convex Cloud took an
afternoon. The environment variables took the rest of the day, because convex
export carries your data and nothing else.*

Bad: *In this post we take a look at our journey migrating to a self-hosted
Convex setup and share some lessons learned along the way.*

---

## 3b. When it goes out

**You never publish manually.** Date the post, push whenever you finished it,
and it goes live on its own.

```markdown
date: 2026-08-11        # a Tuesday — this post appears on the 11th
```

A post dated in the future is built by nobody until its date arrives. CI runs
every day at **14:00 UTC** and publishes whatever came due. That slot is 15:00
in the UK, 10:00 US Eastern, 07:00 US Pacific — a UK afternoon, a US East
mid-morning, and the start of a US West day, which is where a developer
audience actually is.

**Date posts on a Tuesday or Wednesday.** Mid-week consistently beats Monday
(inbox triage) and Friday (nobody is reading long-form). Thursday is fine.

**Cadence: one post a week, or one a fortnight, and never miss it.** Consistency
outperforms volume by a wide margin — a predictable schedule is what turns a
reader into a subscriber. Two good posts a month beats six in January and
nothing after. If you can't sustain weekly, pick fortnightly and hold it.

Write when you have time, queue several ahead, and let the schedule do the rest.
`node scripts/build-blog.mjs --preview` renders the queue locally so you can read
a scheduled post before its date.

## 3c. Make it a thing people can poke at

Prose is the default, not the ceiling. Four containers are available:

````markdown
:::fact The spinner is older than the web
A short aside — history, trivia, the thing you looked up while debugging.
Skippable without losing the thread, which is the whole point.
:::

:::note
Something the reader should know here, in the post's own topic colour.
:::

:::warn
A trap. Use sparingly or it stops meaning anything.
:::

:::demo Optional label
<p>Raw HTML. Inline &lt;style&gt; and &lt;script&gt; are allowed and stay
scoped to this post.</p>
:::
````

The demo container is where a post stops being an article. "The bug with no
spinner" has two little players side by side — one stalls with a spinner, one
stalls without — and you press a button and *see* the difference the whole post
is about. That took thirty lines and it explains the idea better than the three
paragraphs around it.

Rules for a demo:

- **It has to earn its place.** Does it show something the prose can't? If it's
  decoration, cut it.
- **It must work with JavaScript off.** Write the markup so the static state
  already says something true, then let the script animate it. Never a blank
  box waiting for JS.
- **Self-contained.** No CDN, no build step, no library. Scope your class names
  (`sd-` for the spinner demo) so two demos never collide.
- **Respect `prefers-reduced-motion`.** Slow it down or stop it, don't ignore it.
- Test it before you push. Click it twice — replay is where these break.

## 4. Structure

1. **Open on the concrete thing.** The sentence someone said. The number that
   was wrong. The moment the decision had to be made. No throat-clearing, no
   history-of-the-industry paragraph.
2. **Say what the reader gets, inside the first three sentences.** They are
   deciding whether this is for them and what they'll take away. Answer both.
3. **One idea per section, with an honest heading.** Headings should read as a
   summary of the post on their own — most people skim them before reading a
   word of body text.
4. **Show the evidence.** Commands you actually ran, output you actually saw,
   config that is actually in the repo.
5. **Keep the part that surprised you.** It is usually the best paragraph in
   the post and the reason anyone shares it.
6. **End on something usable.** The trade-off, the cost, the thing you'd do
   differently. Never end with a recap of what you just wrote.

Length: as long as the evidence needs and no longer. In practice 700–1,500
words. Longer posts do get shared and linked more, but only when the length is
carrying substance — padding is worse than brevity.

Break up the text. A screenshot, a diagram, a code block, a table — anything
that stops five paragraphs in a row. A rough diagram beats a wall of prose.

---

## 5. Voice: how to not sound like a language model

This is the part that matters most, and it's mostly subtraction.

### Banned outright

These are the strongest tells that a machine wrote something, and the "not X,
it's Y" construction is the single most recognisable:

- "It's not X, it's Y" · "not just X, but Y" · "it's not merely…"
- "In today's fast-paced world" · "in the ever-evolving landscape of…"
- delve · leverage (as a verb) · robust · seamless · pivotal · realm ·
  meticulous · underscores · showcasing · tapestry · testament
- "Let's dive in" · "buckle up" · "unlock" · "empower" · "elevate"
- "As technology continues to evolve" · "at the end of the day"
- Three-item lists where the third item exists for rhythm rather than meaning.
- A closing paragraph that begins "In conclusion" or restates the intro.
- Emoji as section markers. Bold text scattered for emphasis-by-decoration.

### Habits that read human

- **Use contractions.** "doesn't", "it's", "wasn't", "I'd". Formal prose with
  zero contractions is one of the loudest tells there is.
- **Vary sentence length hard.** Long, then short. Three words is a sentence.
  Machine prose defaults to a uniform medium length; people don't.
- **Say "I" and mean it.** Who did the thing? You did. Say so.
- **Let one real detail in that isn't strictly necessary.** The message from
  your mum that started the investigation. The two hours you wasted. That's
  what makes it relatable, and no model invents it because no model was there.
- **Admit the mistake in the sentence where it happened**, not in a reflective
  paragraph at the end. "I checked anyway. Twice."
- **Prefer the concrete noun.** "the cleanup job" not "the maintenance process".
  "63 MB/s" not "strong throughput".
- **Cut every sentence that only restates the previous one.** Drafts are full
  of them.
- **Read it out loud.** Anything you would never say to a colleague, delete.

### The specificity test

Take any sentence and ask: could this appear, unchanged, in a post by a company
that does something completely different? If yes, it's filler. Either make it
specific or cut it.

---

## 6. SEO, without writing for robots

The technical side is handled by the build: canonical URLs, `Article` JSON-LD,
OG tags, the sitemap entry, the RSS item, and the `llms.txt` line all come from
your front matter. You never touch them.

What's left for you:

- **The summary is the meta description.** See §3. Get it right.
- **Answer the question early.** Assistants and search engines lean heavily on
  the first section of a page when deciding what it says. Bury the answer in
  the middle and you're invisible to both.
- **Self-contained sections.** Each `##` should make sense if it's the only
  thing someone reads, because increasingly it is.
- **Use the words people search.** Product names, error strings, exact config
  keys. If the post solves a `404` on HLS segments, the string `404` should be
  in it.
- **Link internally.** To the product page the post is about, to the earlier
  post it builds on. Two or three real links, not a link farm.
- **Never write for the crawler.** Keyword-stuffed prose reads exactly as bad
  to a person as it does to a model, and both are now judging it.

---

## 7. Pre-publish checklist

- [ ] Could only we have written this? (If no, don't publish it.)
- [ ] Does the title contain a specific noun or number?
- [ ] Does the summary say what the reader will *know*, in under 40 words?
- [ ] Is there a real number, command, or piece of output in the first screen?
- [ ] Do the headings alone tell the story?
- [ ] Any banned phrase from §5? Search the file for "not just", "delve",
      "leverage", "In conclusion", "landscape".
- [ ] Are there contractions? Are the sentence lengths uneven?
- [ ] Anything factually wrong, or any credential, key, IP or customer name in
      a code block? Check twice — this is public and permanent.
- [ ] `node scripts/build-blog.mjs` runs clean, and the post renders.

---

## 8. The prompt

Paste this when you want a draft from an AI. It's written to fight the model's
defaults, so don't soften it.

````text
You are drafting a post for the CodeRipple Tech engineering blog. I will give
you raw material — notes, a transcript, terminal output, a diff. Your job is to
turn it into a post that reads like the engineer who did the work wrote it.

NON-NEGOTIABLE VOICE RULES
- Use contractions throughout. "doesn't", "it's", "I'd", "wasn't".
- Vary sentence length aggressively. Some sentences are three words.
- First person, singular. The author is Dan Negoescu, one engineer. "I" for the
  work; "we" only when the sentence is genuinely about the company deciding
  something. Never "we" as a royal plural for one person's debugging session.
- Write to one developer over coffee, not to an audience from a stage. No
  "best practices for", no numbered listicles, no authority voice.
- Never use: "it's not X, it's Y", "not just X but Y", "in today's world",
  "landscape", "delve", "leverage", "robust", "seamless", "pivotal", "realm",
  "meticulous", "underscores", "showcasing", "unlock", "empower", "elevate",
  "let's dive in", "at the end of the day", "In conclusion".
- No three-item lists unless all three items carry weight.
- No closing summary paragraph. End on a trade-off, a number, or a decision.
- No emoji. No bold text used as decoration.
- Every claim gets a concrete number, command, or quote, or it gets cut.

STRUCTURE
- Open with the concrete incident: a sentence someone said, a number that was
  wrong, a decision that had to be made. Never with background or context.
- Within the first three sentences the reader must know who the post is for and
  what they'll get out of it.
- One idea per H2. The H2s alone should summarise the post.
- Keep the part that surprised us and the part where we were wrong. Those are
  the best paragraphs. Do not sand them down.
- End on the cost, the trade-off, or what we'd do differently.
- 700–1,500 words. Shorter if the material is thin. Never pad.

OUTPUT FORMAT
Markdown with this front matter, and nothing before or after it:

---
title: <6-12 words, sentence case, contains a specific noun or number>
date: <YYYY-MM-DD>
topic: <product | engineering | tech>
summary: <2 sentences, 25-40 words, states what the reader will know after
reading, leads with the answer, no "in this post">
---

BEFORE YOU WRITE
Ask me for anything you're missing: the actual numbers, the exact error, what
we tried that didn't work, what it cost. Do not invent a detail, a metric, a
quote or a benchmark. If a fact isn't in the material I gave you, ask for it or
leave it out. An honest gap is fine; a plausible fabrication is not.

AFTER YOU WRITE
List, separately from the post: (1) any sentence you're unsure is factually
correct, (2) anything you had to generalise because the material was thin.
````

### Using it well

- Feed it the raw material, not a summary of the raw material. Terminal output,
  the message from the person who reported it, the diff. The specificity in the
  post can only come from the specificity in what you give it.
- Expect to rewrite the opening and closing paragraphs by hand. Those are the
  two places a model's defaults show most, and the two places a reader decides
  whether you're a person.
- Read the draft out loud before it ships. Every sentence you stumble on is a
  sentence to cut.
