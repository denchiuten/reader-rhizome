
Switch `summarize-connection` from Chat Completions to the Responses API.

## Changes
**`supabase/functions/summarize-connection/index.ts`**
- Endpoint: `https://api.openai.com/v1/chat/completions` → `https://api.openai.com/v1/responses`
- Body: replace `messages: [...]` with `instructions` (system prompt) + `input` (user prompt)
- Response parsing: replace `data.choices[0].message.content` with `data.output_text`
- Keep model `gpt-5-mini`, rate limiting, validation, CORS, and error handling unchanged

## Required scope
On the OpenAI key, enable **Responses → Write** (Chat completions can be set back to None).

## Out of scope
No frontend or hook changes — response shape from the edge function (`{ summary, model }`) stays identical.
