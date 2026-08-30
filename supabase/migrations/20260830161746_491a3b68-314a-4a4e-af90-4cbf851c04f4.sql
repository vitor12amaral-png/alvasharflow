CREATE TABLE public.whatsapp_alert_prefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text,
  enabled boolean not null default true,
  on_due_soon boolean not null default true,
  on_video_approved boolean not null default true,
  on_video_delivered boolean not null default true,
  on_package_limit boolean not null default true,
  on_urgent_task boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_alert_prefs TO authenticated;
GRANT ALL ON public.whatsapp_alert_prefs TO service_role;

ALTER TABLE public.whatsapp_alert_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read workspace alert prefs" ON public.whatsapp_alert_prefs
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "own alert prefs insert" ON public.whatsapp_alert_prefs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));

CREATE POLICY "own alert prefs update" ON public.whatsapp_alert_prefs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "own alert prefs delete" ON public.whatsapp_alert_prefs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER whatsapp_alert_prefs_updated_at BEFORE UPDATE ON public.whatsapp_alert_prefs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz;