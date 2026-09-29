ALTER TABLE public.videos
ADD COLUMN competence_month date;

UPDATE public.videos
SET competence_month = date_trunc('month', COALESCE(due_date::timestamp with time zone, created_at))::date
WHERE competence_month IS NULL;

ALTER TABLE public.videos
ALTER COLUMN competence_month SET DEFAULT date_trunc('month', CURRENT_DATE)::date,
ALTER COLUMN competence_month SET NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_videos_normalize_competence_month()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.competence_month := date_trunc('month', NEW.competence_month)::date;
  RETURN NEW;
END;
$$;

CREATE TRIGGER videos_normalize_competence_month
BEFORE INSERT OR UPDATE OF competence_month ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.tg_videos_normalize_competence_month();

CREATE INDEX videos_workspace_client_competence_idx
ON public.videos (workspace_id, client_id, competence_month);