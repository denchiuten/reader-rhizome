
## The hypothesis

Going 300 → 400 made each source look *sparser*, not denser. That's counterintuitive — we're fetching more, so each book should contribute the same or more highlights, right?

After re-reading `useReadwiseData.ts`, `readwise.ts`, and the `readwise-fetch` edge function, I think there are **two real mechanisms** that can produce this effect, plus one visual illusion.

### Mechanism 1: The fetch is globally chronological, not per-source

The edge function pulls the **N most recent highlights globally** (sorted by `highlighted_at` desc). So the pool is whatever you've been highlighting lately.

- At 300: maybe you've recently been deep in 2–3 books → those books dominate, each with 30–60 highlights.
- At 400: the extra 100 reach further back in time → they pull in *many more distinct sources* (older books, one-off articles), each contributing only 1–3 highlights.

So 400 doesn't add 100 highlights to existing sources — it mostly adds **new sources with very few highlights each**. Average highlights-per-source goes *down*.

### Mechanism 2: `DISPLAY_CAP` is applied *after* filtering, but *before* connections — and it's a hard slice

```ts
.slice(0, DISPLAY_CAP)
```

This is fine on its own. But combined with mechanism 1, the visible graph at 400 has a long tail of singleton sources, which visually dilutes the dense clusters.

### Mechanism 3 (visual illusion): Connection caps stay constant

`maxEdges: 220` and `perNode: 7` don't scale with highlight count. With 400 nodes competing for the same 220 edges, each dense cluster gets *proportionally fewer* visible connections than at 300. So even if a book has the same number of highlights, fewer of its internal/external links survive the cap → it *looks* sparser.

## What I'd verify before changing anything

I want to actually count this rather than guess. The edge function returns the full pool — I can add a one-time `console.table` of highlights-per-source at both 300 and 400 caps, so we can see the real distribution. No code changes to behavior, just diagnostic logging.

## Proposed plan

**Step 1 — Diagnose (quick, ~5 lines)**
Add a dev-only `console.log` in `useReadwiseData.ts` after the filter that prints highlights-per-source counts and the source count. You reload once at 400, once at 300, and we compare. This confirms or kills the hypothesis in 30 seconds.

**Step 2 — Based on what we see, pick a fix:**

| If we see… | Fix |
|---|---|
| 400 has many more singleton sources than 300 | Scale `maxEdges`/`perNode` with `highlights.length` (e.g. `maxEdges = highlights.length * 0.6`) so connection density stays constant |
| Same source count, just visually diluted | Same as above — it's purely a cap-scaling issue |
| Dense books really did lose highlights | Investigate edge function pagination/ordering |

**Step 3 — Optional follow-up:** Surface the source-count and avg-highlights-per-source in the header stats so you can see the distribution at a glance whenever you tweak the cap.

## Recommendation

Start with **Step 1 only**. It's a single `console.log`, zero behavior change, and gives us ground truth instead of more guessing. Then we decide between scaling the connection caps vs. changing the fetch strategy.
