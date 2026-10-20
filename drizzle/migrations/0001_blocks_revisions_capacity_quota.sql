ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS block_reason text, ADD COLUMN IF NOT EXISTS block_note text, ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS weekly_capacity_hours numeric NOT NULL DEFAULT 40;

CREATE OR REPLACE FUNCTION public.tg_videos_count_revision() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'alteracoes' AND OLD.status IS DISTINCT FROM 'alteracoes' THEN
    NEW.revision_count := COALESCE(OLD.revision_count, 0) + 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_videos_count_revision BEFORE UPDATE OF status ON public.videos FOR EACH ROW EXECUTE FUNCTION public.tg_videos_count_revision();

CREATE OR REPLACE FUNCTION public.tg_videos_sync_package_quota() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.package_id IS NOT NULL THEN
    UPDATE public.client_packages SET videos_used = (SELECT count(*) FROM public.videos WHERE package_id = OLD.package_id) WHERE id = OLD.package_id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.package_id IS NOT NULL THEN
    UPDATE public.client_packages SET videos_used = (SELECT count(*) FROM public.videos WHERE package_id = NEW.package_id) WHERE id = NEW.package_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_videos_sync_package_quota AFTER INSERT OR DELETE OR UPDATE OF package_id ON public.videos FOR EACH ROW EXECUTE FUNCTION public.tg_videos_sync_package_quota();

UPDATE public.client_packages p SET videos_used = sub.c FROM (SELECT cp.id, (SELECT count(*) FROM public.videos v WHERE v.package_id = cp.id) c FROM public.client_packages cp) sub WHERE sub.id = p.id AND p.videos_used IS DISTINCT FROM sub.c;