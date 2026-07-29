-- 1) Coluna de auto-referência
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS parent_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_parent ON public.clients(parent_client_id);

-- 2) Trigger de guard: sem sub-de-sub e herda workspace do pai
CREATE OR REPLACE FUNCTION public.tg_clients_enforce_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_parent_parent uuid;
  v_parent_ws uuid;
BEGIN
  IF NEW.parent_client_id IS NOT NULL THEN
    IF NEW.parent_client_id = NEW.id THEN
      RAISE EXCEPTION 'client cannot be its own parent';
    END IF;
    SELECT parent_client_id, workspace_id INTO v_parent_parent, v_parent_ws
    FROM public.clients WHERE id = NEW.parent_client_id;
    IF v_parent_parent IS NOT NULL THEN
      RAISE EXCEPTION 'nested sub-clients are not allowed';
    END IF;
    IF v_parent_ws IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM v_parent_ws THEN
      NEW.workspace_id := v_parent_ws;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_enforce_parent ON public.clients;
CREATE TRIGGER clients_enforce_parent
  BEFORE INSERT OR UPDATE OF parent_client_id, workspace_id ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_clients_enforce_parent();

-- 3) Ajustar trigger de vídeo para contar consumo no pacote do pai
CREATE OR REPLACE FUNCTION public.tg_log_video_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid;
  v_target_pkg uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
    VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'created',
            jsonb_build_object('title', NEW.title, 'status', NEW.status), NEW.workspace_id);

    v_target_pkg := NEW.package_id;
    IF v_target_pkg IS NULL THEN
      -- Se vídeo pertence a um sub-cliente, pega o pacote ativo do pai
      SELECT parent_client_id INTO v_parent FROM public.clients WHERE id = NEW.client_id;
      IF v_parent IS NOT NULL THEN
        SELECT id INTO v_target_pkg FROM public.client_packages
          WHERE client_id = v_parent AND status = 'ativo'
          ORDER BY created_at DESC LIMIT 1;
      END IF;
    END IF;

    IF v_target_pkg IS NOT NULL THEN
      UPDATE public.client_packages SET videos_used = videos_used + 1 WHERE id = v_target_pkg;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
      VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'status_changed',
              jsonb_build_object('title', NEW.title, 'from', OLD.status, 'to', NEW.status), NEW.workspace_id);
    END IF;
    IF NEW.editor_id IS DISTINCT FROM OLD.editor_id THEN
      INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
      VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'assigned',
              jsonb_build_object('title', NEW.title, 'editor_id', NEW.editor_id), NEW.workspace_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;