CREATE TABLE public.content_embeddings (
  text_hash text PRIMARY KEY,
  embedding extensions.vector(1536) NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON TABLE public.content_embeddings TO service_role;
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.content_embeddings (text_hash, embedding, model)
SELECT DISTINCT ON (text_hash) text_hash, embedding, model
FROM public.highlight_embeddings
ORDER BY text_hash, updated_at DESC
ON CONFLICT (text_hash) DO NOTHING;

COMMENT ON TABLE public.highlight_embeddings IS 'DEPRECATED: replaced by public.content_embeddings; existing records retained unchanged.';