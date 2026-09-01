ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS unit_price numeric,
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS batch_label text;

CREATE INDEX IF NOT EXISTS videos_batch_id_idx ON public.videos(batch_id);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS drive_folder_url text;

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS drive_root_folder_id text,
  ADD COLUMN IF NOT EXISTS drive_folder_template jsonb NOT NULL DEFAULT '["Bruto","Editado","Entregue","Referências"]'::jsonb;

CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'Geral',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_templates TO authenticated;
GRANT ALL ON public.proposal_templates TO service_role;

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read proposals" ON public.proposal_templates
  FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS members insert proposals" ON public.proposal_templates
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS members update proposals" ON public.proposal_templates
  FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS admins delete proposals" ON public.proposal_templates
  FOR DELETE TO authenticated
  USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

CREATE TRIGGER trg_proposals_updated
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();