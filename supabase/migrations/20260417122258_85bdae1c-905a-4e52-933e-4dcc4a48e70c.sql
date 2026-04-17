-- Ensure extension is in the extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Drop and recreate the embeddings cache table with an explicitly schema-qualified vector type
DROP TABLE IF EXISTS public.highlight_embeddings CASCADE;

CREATE TABLE public.highlight_embeddings (
  highlight_id bigint PRIMARY KEY,
  text_hash text NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  model text NOT NULL DEFAULT 'text-embedding-3-small',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.highlight_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Embeddings are publicly readable"
  ON public.highlight_embeddings
  FOR SELECT
  USING (true);

CREATE TRIGGER set_highlight_embeddings_updated_at
  BEFORE UPDATE ON public.highlight_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX highlight_embeddings_embedding_idx
  ON public.highlight_embeddings
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- Force PostgREST to refresh its schema cache so the vector type resolves correctly
NOTIFY pgrst, 'reload schema';