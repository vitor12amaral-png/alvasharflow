
-- === Enums ===
DO $$ BEGIN
  CREATE TYPE public.task_category AS ENUM ('financeiro','atendimento','marketing','edicao','administrativo','geral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_recurrence AS ENUM ('none','daily','weekly','monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketing_content_type AS ENUM ('reels','post','story','carousel','video_longo','shorts','artigo','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM ('planejada','em_andamento','concluida','pausada','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- === Tasks: add category + recurrence ===
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category public.task_category NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS recurrence public.task_recurrence NOT NULL DEFAULT 'none';

-- === Marketing scripts: add editor fields ===
ALTER TABLE public.marketing_scripts
  ADD COLUMN IF NOT EXISTS hook TEXT,
  ADD COLUMN IF NOT EXISTS development TEXT,
  ADD COLUMN IF NOT EXISTS cta TEXT,
  ADD COLUMN IF NOT EXISTS technical_notes TEXT,
  ADD COLUMN IF NOT EXISTS content_type public.marketing_content_type NOT NULL DEFAULT 'reels',
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- === Marketing content (editorial calendar) ===
CREATE TABLE IF NOT EXISTS public.marketing_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type public.marketing_content_type NOT NULL DEFAULT 'reels',
  status public.marketing_status NOT NULL DEFAULT 'ideia',
  platform TEXT,
  scheduled_for DATE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  script_id UUID REFERENCES public.marketing_scripts(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_content TO authenticated;
GRANT ALL ON public.marketing_content TO service_role;
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read marketing_content" ON public.marketing_content
  FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS admins manage marketing_content" ON public.marketing_content
  FOR ALL TO authenticated
  USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id))
  WITH CHECK (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

CREATE INDEX IF NOT EXISTS idx_mc_ws ON public.marketing_content(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mc_scheduled ON public.marketing_content(scheduled_for);

CREATE TRIGGER trg_mc_updated BEFORE UPDATE ON public.marketing_content
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- === Marketing campaigns ===
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12,2),
  status public.campaign_status NOT NULL DEFAULT 'planejada',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read campaigns" ON public.marketing_campaigns
  FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS admins manage campaigns" ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id))
  WITH CHECK (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

CREATE INDEX IF NOT EXISTS idx_camp_ws ON public.marketing_campaigns(workspace_id);

CREATE TRIGGER trg_camp_updated BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- === activity_log privacy: drop legacy staff policies, add editor-scoped one ===
DROP POLICY IF EXISTS "Staff read activity" ON public.activity_log;
DROP POLICY IF EXISTS "Staff insert activity" ON public.activity_log;
DROP POLICY IF EXISTS "WS members read activity" ON public.activity_log;

CREATE POLICY "WS admins read all activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role));

CREATE POLICY "Editors read own activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND actor_id = auth.uid());

CREATE POLICY "WS members insert activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));
