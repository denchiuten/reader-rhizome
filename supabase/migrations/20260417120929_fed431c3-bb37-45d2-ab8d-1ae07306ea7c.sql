-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table
CREATE TABLE public.highlight_embeddings (
  highlight_id BIGINT PRIMARY KEY,
  text_hash TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.highlight_embeddings ENABLE ROW LEVEL SECURITY;

-- Public read (app is public, same posture as readwise-fetch results)
CREATE POLICY "Embeddings are publicly readable"
ON public.highlight_embeddings
FOR SELECT
USING (true);

-- No client writes; service role bypasses RLS automatically.

-- Optional ANN index for future SQL-side similarity
CREATE INDEX highlight_embeddings_vec_idx
ON public.highlight_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER highlight_embeddings_set_updated_at
BEFORE UPDATE ON public.highlight_embeddings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();