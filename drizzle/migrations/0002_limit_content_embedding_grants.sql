REVOKE ALL PRIVILEGES ON TABLE public.content_embeddings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.content_embeddings TO service_role;