CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX notifications_user_idx ON public.notifications (user_id, read_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_notifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_notifications_updated_at();

-- vídeo aprovado / entregue -> avisa todos os membros do workspace
CREATE OR REPLACE FUNCTION public.notify_video_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cname text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('aprovado','entregue') THEN
    SELECT name INTO cname FROM public.clients WHERE id = NEW.client_id;
    INSERT INTO public.notifications (workspace_id, user_id, kind, title, body, link, video_id, client_id)
    SELECT NEW.workspace_id, wm.user_id,
      CASE WHEN NEW.status = 'aprovado' THEN 'video_aprovado' ELSE 'video_entregue' END,
      CASE WHEN NEW.status = 'aprovado' THEN 'Vídeo aprovado' ELSE 'Vídeo entregue' END,
      COALESCE(cname, 'Cliente') || ' · ' || NEW.title,
      '/workflow', NEW.id, NEW.client_id
    FROM public.workspace_members wm
    WHERE wm.workspace_id = NEW.workspace_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_video_status_trg AFTER UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.notify_video_status();

-- tarefa urgente atribuída -> avisa o responsável
CREATE OR REPLACE FUNCTION public.notify_urgent_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL
     AND NEW.priority = 'urgente'
     AND NEW.status = 'aberta'
     AND (TG_OP = 'INSERT'
          OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
          OR NEW.priority IS DISTINCT FROM OLD.priority) THEN
    INSERT INTO public.notifications (workspace_id, user_id, kind, title, body, link, task_id, client_id)
    VALUES (NEW.workspace_id, NEW.assignee_id, 'tarefa_urgente', 'Tarefa urgente atribuída', NEW.title, '/tarefas', NEW.id, NEW.client_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_urgent_task_trg AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_urgent_task();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;