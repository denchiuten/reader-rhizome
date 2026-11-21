CREATE TABLE public.reading_snapshots (
 kind text PRIMARY KEY,
 payload jsonb NOT NULL,
 synced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reading_snapshots TO service_role;
ALTER TABLE public.reading_snapshots ENABLE ROW LEVEL SECURITY;