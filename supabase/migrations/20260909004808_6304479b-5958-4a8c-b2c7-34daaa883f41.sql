CREATE TABLE IF NOT EXISTS public.copilot_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'fact',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS copilot_memory_workspace_id_idx ON public.copilot_memory(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.copilot_memory TO authenticated;
GRANT ALL ON public.copilot_memory TO service_role;

ALTER TABLE public.copilot_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read copilot memory" ON public.copilot_memory
  FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS members insert copilot memory" ON public.copilot_memory
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id) AND author_id = auth.uid());

CREATE POLICY "WS members update own copilot memory" ON public.copilot_memory
  FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id) AND author_id = auth.uid())
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id) AND author_id = auth.uid());

CREATE POLICY "WS members delete own copilot memory" ON public.copilot_memory
  FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id) AND author_id = auth.uid());

CREATE TRIGGER trg_copilot_memory_updated
  BEFORE UPDATE ON public.copilot_memory
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
