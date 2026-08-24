ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS pause_reason text,
  ADD COLUMN IF NOT EXISTS pause_until date;

ALTER TYPE package_status ADD VALUE IF NOT EXISTS 'arquivado';

CREATE TYPE public.lead_stage AS ENUM ('novo','conversa','proposta','follow_up','fechando','fechado','perdido');

CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  source text,
  estimated_value numeric,
  stage public.lead_stage NOT NULL DEFAULT 'novo',
  last_contact_at date,
  next_follow_up date,
  notes text,
  color text,
  position integer NOT NULL DEFAULT 0,
  converted_client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_members" ON public.leads FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leads_insert_members" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "leads_update_members" ON public.leads FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "leads_delete_admins" ON public.leads FOR DELETE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));

CREATE INDEX idx_leads_workspace_stage ON public.leads(workspace_id, stage);

CREATE TABLE public.lead_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'nota',
  happened_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text NOT NULL DEFAULT '',
  author_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_activities_select_members" ON public.lead_activities FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "lead_activities_insert_members" ON public.lead_activities FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "lead_activities_update_members" ON public.lead_activities FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "lead_activities_delete_admins" ON public.lead_activities FOR DELETE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));

CREATE INDEX idx_lead_activities_lead ON public.lead_activities(lead_id);

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();