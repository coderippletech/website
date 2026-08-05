---
title: "Self-hosting Convex: the 16 variables an export leaves behind"
date: 2026-08-03
topic: engineering
summary: Three apps, three backends, one Postgres. Moving off Convex Cloud took an afternoon. The environment variables took the rest of the day, because convex export carries your data and nothing else.
---

Convex Cloud is good. It's also a subscription, and once you're already paying
for a server the maths stops being obvious. Moving three apps onto a
self-hosted Convex took an afternoon — and almost all of that afternoon went on
one thing nobody warns you about.

## One backend is one deployment

The first instinct is to run a single Convex backend and point all three apps at
it. That doesn't work. A Convex backend serves exactly **one** deployment. Three
apps with different schemas would collide on day one — one has `workspaces` and
`captures`, another has `plateCache` and `dvsaToken`, and they'd be sharing a
table namespace.

So it's one backend per app. They can still share a Postgres server, because
Convex derives its database name from `INSTANCE_NAME`, swapping hyphens for
underscores:

```yaml
ripplebug:
  image: ghcr.io/get-convex/convex-backend:latest
  environment:
    - INSTANCE_NAME=ripplebug
    - POSTGRES_URL=${POSTGRES_URL}
```

Three of those, three databases, one Postgres container. Each backend idles
around 30 MB, so separating them costs nothing worth counting.

## The part that bites

`convex export` carries **data only**. It does not carry your deployment's
environment variables.

That's obvious in hindsight and invisible at the time, because everything looks
fine. The data's there. The dashboard loads. Functions deploy. And then nobody
can sign in, because `JWT_PRIVATE_KEY` and `JWKS` never came across, and without
them Convex Auth can't mint or verify a session.

The failure is silent in the worst way. It isn't a line in a log, it's a login
page that just doesn't work. On one app alone, sixteen variables were still
sitting on the old deployment: auth keys, Stripe price IDs, a Resend key, an
OpenAI token.

Copy them across explicitly:

```bash
npx convex env list                    # against the cloud deployment
npx convex env get NAME                # one at a time
CONVEX_SELF_HOSTED_URL=... npx convex env set NAME value
```

Two traps in that last command. Values that start with `-` — a PEM key, some
secrets — get parsed as CLI flags, so you need `convex env set -- NAME value`.
And multi-line values truncate at the first newline if you set them from
Windows, because argv doesn't survive it. Set those from the server.

## What it actually costs

Three backends, one Postgres, behind a reverse proxy that was already running.
Idle memory for the whole set is under 200 MB. The deploy pipeline changed by
one variable — `CONVEX_DEPLOY_KEY` becomes `CONVEX_SELF_HOSTED_URL` plus an
admin key — and CI didn't otherwise care.

Honest summary: the migration is easy, the environment variables are the entire
difficulty, and you want to have checked them *before* you cancel anything.
