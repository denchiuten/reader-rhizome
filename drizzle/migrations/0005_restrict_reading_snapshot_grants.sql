REVOKE ALL ON public.reading_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reading_snapshots TO service_role;