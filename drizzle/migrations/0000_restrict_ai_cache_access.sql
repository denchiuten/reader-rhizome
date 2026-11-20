DROP POLICY IF EXISTS "Connection summaries are publicly readable" ON public.connection_summaries;
DROP POLICY IF EXISTS "Embeddings are publicly readable" ON public.highlight_embeddings;

ALTER TABLE public.connection_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_embeddings ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.connection_summaries FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.highlight_embeddings FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.connection_summaries TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.highlight_embeddings TO service_role;