
## Goal
Add an AI-generated explanation of a selected connection, shown in the existing connection panel when a user clicks a line.

## Feasibility
Yes — this can absolutely be powered by your own OpenAI API key.

## Recommended architecture
Use a backend function to generate the summary after a connection is selected.

```text
User clicks line
→ ConnectionDetail opens
→ frontend calls backend function with highlight A + highlight B
→ backend builds prompt and calls AI provider
→ backend returns short summary
→ panel shows summary / loading / retry state
```

## Provider options
### Option 1 — Your OpenAI API key
- Store `OPENAI_API_KEY` as a backend secret
- Backend function calls OpenAI directly
- Uses your own OpenAI billing/models

### Option 2 — Built-in Lovable AI
- No extra key needed
- Same UI/architecture
- Easier setup

The app can support either; only the backend call changes.

## What I would build
1. Add a new backend function, e.g. `summarize-connection`
   - validate the two highlights
   - build a prompt from both highlight texts, notes, titles, authors, and shared terms
   - call OpenAI with your API key
   - return a concise summary

2. Update `ConnectionDetail.tsx`
   - add an “AI summary” section
   - show loading, success, and error states
   - optionally add a retry button

3. Add a small frontend hook/helper
   - invoke the backend function
   - cache results for the current session so repeated clicks on the same line don’t re-request unnecessarily

## UX choice
Two good patterns:
- Auto-generate when the connection opens
- Generate only when the user clicks a “Summarize connection” button

I’d recommend the button first if you want to control cost.

## Files likely involved
- `src/components/ConnectionDetail.tsx`
- new frontend helper/hook for fetching summaries
- new backend function under `supabase/functions/`

## Technical details
- Keep the API key only in the backend, never in the browser
- Return short summaries only, such as 2–4 sentences
- Add clear handling for rate limits and API errors
- If desired, we can later add model selection or persistent caching

## Decision to make before implementation
Choose one:
1. Use your own OpenAI API key
2. Use built-in Lovable AI

And choose one trigger:
1. Auto-generate on connection open
2. Generate on button click

## If you approve
I’ll implement the backend function and wire the summary into the existing connection panel with loading/error states.
