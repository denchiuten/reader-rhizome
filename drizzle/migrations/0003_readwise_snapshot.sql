CREATE TABLE public.readwise_snapshots (
  kind text PRIMARY KEY,
  payload jsonb NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.readwise_snapshots FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.readwise_snapshots TO service_role;
ALTER TABLE public.readwise_snapshots ENABLE ROW LEVEL SECURITY;