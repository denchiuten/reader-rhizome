CREATE TABLE public.connection_summaries (
  highlight_id_a bigint NOT NULL,
  highlight_id_b bigint NOT NULL,
  summary text NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (highlight_id_a, highlight_id_b),
  CONSTRAINT connection_summaries_canonical_order CHECK (highlight_id_a < highlight_id_b)
);

ALTER TABLE public.connection_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connection summaries are publicly readable"
ON public.connection_summaries
FOR SELECT
USING (true);