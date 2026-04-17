

## Highlight Graph — Web App Plan

A personal, single-user web app that pulls your Readwise highlights and renders them as an interactive 2D force graph. Optimized for desktop, simplified for mobile.

### Architecture
- **Frontend only**, hosted on Lovable. No accounts, no database.
- Your Readwise access token is stored as a **Lovable Cloud secret** (server-side). A thin **edge function** proxies calls to Readwise so the token never reaches the browser.
- Graph rendering with `react-force-graph-2d` (the React wrapper for the same `force-graph` library used in the original skill).

### Data flow
1. **Fetch highlights** — edge function calls Readwise `GET /highlights/?page_size=100` for pages 1 and 2 (200 highlights), then `GET /books/?ids=…` to enrich each highlight with source title and author. Returned to the client as a clean array.
2. **Build same-source edges** — every pair of highlights from the same book/article is linked (the dense colored clusters in the original).
3. **Find cross-source connections** — for each highlight, the edge function calls Readwise's `GET /highlights/search/?query=<text snippet>` (Readwise's built-in semantic search). We keep top 1–2 hits that come from a *different* source, dedupe pairs, and cap total cross-source edges (~30) for readability. This uses Readwise's own embeddings — no extra AI cost.
4. **Render** — graph appears immediately after step 1 with same-source edges; cross-source edges stream in as step 3 completes (progress indicator at top).

### UI
- **Header**: title, highlight count, source count, connection count, **Refresh** button (re-pulls latest 200).
- **Graph canvas** (full viewport on desktop):
  - Nodes colored by source (rose-pine palette, matching the skill).
  - Same-source edges: solid, source color, thin.
  - Cross-source edges: dashed purple with animated particles.
  - Hover a node → fades unrelated nodes; click → opens detail panel.
- **Detail panel** (right sidebar on desktop, bottom sheet on mobile):
  - Highlight text, your note, source title + author, link to Readwise.
  - "Connected ideas" list (cross-source neighbors, with the matching-snippet preview).
  - "Other highlights from this source" list.
- **Source legend** (collapsible): click a source to isolate it; shift-click to toggle.

### Mobile (simplified view, <768px)
- Show only the **top-N most-connected nodes** (default 60) so the graph stays readable.
- Touch: pinch to zoom, drag to pan, tap node → bottom sheet.
- Toggle in header to switch between "Simplified graph" and a fallback **scrollable source list** if the graph still feels cramped.
- Smaller fonts, larger tap targets, hide legend behind a button.

### Performance & polish
- Loading skeleton + progress text ("Pulled 200 highlights · finding connections… 47 / 200").
- Cache last fetch in `localStorage` so reopening the app is instant; Refresh re-pulls.
- Graceful errors if the Readwise token is missing/invalid (clear message pointing to where to set the secret).

### Setup the user does once
After approval, I'll prompt for your **Readwise access token** (from readwise.io/access_token) as a secret. Lovable Cloud auto-enables for the edge function.

### Out of scope (can add later)
- Multi-user accounts, per-user tokens
- LLM-generated "why these connect" labels (Readwise search gives us the link, not a prose explanation)
- Filtering by tag/book, date range, search box
- Persisting graphs/snapshots

