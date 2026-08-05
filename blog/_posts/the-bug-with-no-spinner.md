---
title: The bug with no spinner
date: 2026-08-02
topic: tech
summary: A video kept stopping and starting with no buffering circle. That missing circle ruled out half the system before I'd opened a single graph, and I checked the graphs anyway.
tags: debugging, hls, jellyfin, streaming, self-hosting
---

Someone told me a video kept stopping. It would freeze for a while, then carry
on by itself. Then they added the detail that solved it:

> The spinning circle doesn't appear when it stops, like it normally does when
> the internet drops.

That sentence is the whole diagnosis, and it took me an embarrassingly long
time to hear it.

## What a spinner actually means

A buffering spinner means the player asked for data and is *waiting*. There's a
request open. The network might be slow, the server might be slow, but the
conversation is still going.

No spinner means the player isn't waiting for anything. It either got an answer
it couldn't use, or it stopped asking. Those are different failures in different
halves of the system.

Here are both, side by side. Hit play and watch which one spins.

:::demo Two ways for a video to stop
<style>
  .sd-wrap{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media (max-width:520px){.sd-wrap{grid-template-columns:1fr}}
  .sd-lane{border:1px solid var(--card-border);border-radius:10px;padding:13px 14px;background:rgba(0,0,0,.25)}
  .sd-head{font-size:.75rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:10px}
  .sd-screen{height:64px;border-radius:8px;background:#05070b;border:1px solid var(--card-border);display:grid;place-items:center;position:relative;overflow:hidden}
  .sd-frame{font-size:1.5rem;font-variant-numeric:tabular-nums;color:#dbe4f0;font-weight:600}
  .sd-spin{position:absolute;width:20px;height:20px;border-radius:50%;border:2.5px solid rgba(255,255,255,.18);border-top-color:#dbe4f0;animation:sd-rot .8s linear infinite}
  @keyframes sd-rot{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){.sd-spin{animation-duration:2.4s}}
  .sd-bar{height:4px;border-radius:3px;background:rgba(255,255,255,.09);margin-top:11px;overflow:hidden}
  .sd-bar i{display:block;height:100%;background:var(--shelf);width:0;border-radius:3px}
  .sd-note{margin-top:9px;font-size:.8rem;line-height:1.5;color:var(--muted);min-height:2.6em}
  .sd-note b{color:#dbe4f0;font-weight:650}
  .sd-controls{margin-top:15px;display:flex;align-items:center;gap:13px;flex-wrap:wrap}
  .sd-status{font-size:.8rem;color:var(--muted)}
</style>
<div class="sd-wrap">
  <div class="sd-lane" id="sd-slow">
    <div class="sd-head">Slow network</div>
    <div class="sd-screen"><span class="sd-frame">00:00</span></div>
    <div class="sd-bar"><i></i></div>
    <p class="sd-note">The next segment is late. The request is still open, so the player knows it is waiting.</p>
  </div>
  <div class="sd-lane" id="sd-gone">
    <div class="sd-head">Segment deleted &rarr; 404</div>
    <div class="sd-screen"><span class="sd-frame">00:00</span></div>
    <div class="sd-bar"><i></i></div>
    <p class="sd-note">The next segment is gone. The server answers immediately, so there is nothing to wait for.</p>
  </div>
</div>
<div class="sd-controls">
  <button type="button" id="sd-play">Play both</button>
  <span class="sd-status" id="sd-status">Not running &mdash; this is a simulation, no video is loaded.</span>
</div>
<figcaption>Same stall, same duration. Only one of them has anything pending, so
only one of them can show you a spinner. That difference is the whole
diagnosis.</figcaption>
<script>
(() => {
  const btn = document.getElementById("sd-play");
  if (!btn) return;
  const status = document.getElementById("sd-status");
  const lanes = [
    { el: document.getElementById("sd-slow"), spins: true,
      stalled: "Waiting on a slow response. <b>Spinner shown.</b>",
      resumed: "Segment arrived late. Playback continues." },
    { el: document.getElementById("sd-gone"), spins: false,
      stalled: "Got a 404 and stopped asking. <b>No spinner &mdash; nothing is pending.</b>",
      resumed: "Server rebuilt the segment. Playback jumps back in." },
  ].map((l) => ({ ...l,
    frame: l.el.querySelector(".sd-frame"),
    bar: l.el.querySelector(".sd-bar i"),
    note: l.el.querySelector(".sd-note"),
    screen: l.el.querySelector(".sd-screen"),
    idle: l.el.querySelector(".sd-note").innerHTML,
  }));

  const STALL_AT = 38;                     // percent through a 1:30 clip
  const clock = (p) => {
    const t = Math.round(p * 0.9);         // 100% === 90 seconds
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  };
  const spinners = (lane, on) => {
    lane.screen.querySelectorAll(".sd-spin").forEach((s) => s.remove());
    if (on && lane.spins) {
      const s = document.createElement("span");
      s.className = "sd-spin";
      s.setAttribute("aria-hidden", "true");
      lane.screen.appendChild(s);
    }
  };

  let timer = null;

  function reset() {
    lanes.forEach((l) => {
      l.bar.style.width = "0%";
      l.frame.textContent = "0:00";
      l.note.innerHTML = l.idle;
      spinners(l, false);
    });
  }

  btn.addEventListener("click", () => {
    if (timer) return;
    reset();
    btn.textContent = "Playing…";
    btn.disabled = true;
    status.textContent = "Both players stall for the same 1.4 seconds.";

    let p = 0;
    let phase = "playing";               // playing → stalled → resumed

    timer = setInterval(() => {
      // The stall freezes the playhead. Only the lane with a request still open
      // is allowed a spinner — that is the entire point of the demo.
      if (phase === "playing" && p >= STALL_AT) {
        phase = "stalled";
        lanes.forEach((l) => { l.note.innerHTML = l.stalled; spinners(l, true); });
        setTimeout(() => {
          if (phase !== "stalled") return;
          phase = "resumed";
          lanes.forEach((l) => { l.note.innerHTML = l.resumed; spinners(l, false); });
        }, 1400);
      }
      if (phase === "stalled") return;

      p += 1;
      lanes.forEach((l) => {
        l.bar.style.width = p + "%";
        l.frame.textContent = clock(p);
      });

      if (p >= 100) {
        clearInterval(timer);
        timer = null;
        btn.disabled = false;
        btn.textContent = "Play again";
        status.textContent = "One spinner, two stalls. That is what gave it away.";
      }
    }, 40);
  });
})();
</script>
:::

I spent the first hour checking everything a spinner would have implicated:
server load, disk I/O, network errors, bandwidth. All clean. Load average 0.14,
zero packet loss, and a sustained pull of 1.3 GB at 63 MB/s without a single
stall.

None of it mattered. The symptom had already ruled that half out.

## The actual cause

The player was streaming HLS, which chops video into numbered segments. A
cleanup job I'd scheduled was deleting those segments every four hours,
including while someone was watching.

So the player asks for the next segment and gets a **404**. Not slow data — no
data, immediately, with an answer. Nothing to buffer, nothing to spin for.
Playback just stops until the server notices and starts producing segments
again from that position. That's the pause, and then the restart.

The fix was two settings that should have been on from day one:

- **Throttling** — the encoder pauses once it's far enough ahead, instead of
  racing to transcode a whole film as fast as the CPU allows.
- **Segment deletion** — old segments get dropped as playback moves past them,
  so the cache stays small *by design* instead of needing a sweep that can
  collide with someone watching.

With both on, the cleanup job has nothing left to clean up mid-stream.

:::fact The spinner is older than the web
The idea of showing a spinning shape to mean "still working" comes from the
1980s Macintosh, where a spinning watch cursor told you the machine hadn't
died. It was always a promise about *pending work*, not about slowness. Which
is exactly why its absence is information — a player that isn't waiting has
nothing to promise you.
:::

## The lesson I keep relearning

Every instinct I have points at throughput. The person reporting it had already
told me it wasn't throughput. I checked anyway. Twice. Because throughput is
what I know how to measure.

People using your software hand you the deciding detail without knowing it's
the deciding detail. That one sentence contained a fact none of my monitoring
had: the client wasn't waiting. No dashboard I own would ever have shown me
that.
