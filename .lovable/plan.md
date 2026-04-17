
Diagnosis

- I inspected the current backend state and the mismatch is clear:
  - the `vector` extension exists in the `extensions` schema
  - the `highlight_embeddings.embedding` column also reports `extensions.vector`
  - but the runtime error says the API layer is trying to resolve `public.vector`
- The most likely cause is the migration order:
  1. create extension as unqualified `vector`
  2. create the table with `embedding vector(1536)`
  3. later move the extension to `extensions`
- That sequence can leave the REST/schema metadata resolving the type incorrectly, even though the database now shows the right schema.

Plan

1. Add one corrective migration
- Do not edit the old applied migrations.
- Create a new migration that rebuilds the embeddings cache table with an explicitly schema-qualified type:
  - `embedding extensions.vector(1536)`
- Recreate the same policy, trigger, and ANN index.
- This is safe because `highlight_embeddings` is only a derived cache and can be regenerated.

2. Normalize extension setup
- In the new migration, ensure the extension lives in `extensions` directly:
  - `CREATE SCHEMA IF NOT EXISTS extensions`
  - `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions`
- Avoid relying on unqualified `vector(...)` anywhere going forward.

3. Force the API layer to refresh schema metadata
- Add `NOTIFY pgrst, 'reload schema';` at the end of the migration.
- This should clear the stale `public.vector` resolution that the edge function is hitting.

4. Harden the embedding path
- Keep the current vector string upsert format in `embed-highlights`; that part is correct.
- Add slightly clearer error reporting in the function around select/upsert failures so type-resolution issues are obvious if they ever recur.

5. Keep the UI resilient
- Review `useReadwiseData` so embedding failures remain non-fatal:
  - highlights should still render
  - semantic connections should downgrade to lexical fallback
  - the app should never blank just because embeddings failed

Files to update

- `supabase/migrations/<new-fix>.sql`
- `supabase/functions/embed-highlights/index.ts` (only for better diagnostics/fallback safety if needed)
- `src/hooks/useReadwiseData.ts` (only if a final guard is needed for non-fatal fallback)

Validation after implementation

- Confirm `highlight_embeddings.embedding` is defined as `extensions.vector`
- Call `embed-highlights` with a small payload and verify it returns embeddings instead of 500
- Refresh the app and confirm:
  - highlights load normally
  - semantic connections appear
  - if embedding fails, the graph still renders with lexical fallback instead of a blank screen
