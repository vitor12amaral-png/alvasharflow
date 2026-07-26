
-- 1) Client library: link vs file, categoria livre, favoritos, thumbnail
ALTER TABLE public.client_library
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'file' CHECK (kind IN ('link','file')),
  ADD COLUMN IF NOT EXISTS link_category text,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- 2) time_entries
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (video_id IS NOT NULL OR task_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_time_entries_ws ON public.time_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_video ON public.time_entries(video_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON public.time_entries(task_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read time_entries" ON public.time_entries FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));
CREATE POLICY "Users insert own time_entries" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));
CREATE POLICY "Users update own time_entries" ON public.time_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND is_workspace_active(workspace_id))
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own or admin delete" ON public.time_entries FOR DELETE TO authenticated
  USING ((user_id = auth.uid() OR has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role)) AND is_workspace_active(workspace_id));

CREATE TRIGGER trg_time_entries_updated BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3) client_interactions
CREATE TABLE IF NOT EXISTS public.client_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'nota' CHECK (kind IN ('reuniao','ligacao','mensagem','email','nota')),
  happened_at timestamptz NOT NULL DEFAULT now(),
  notes text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interactions_ws ON public.client_interactions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON public.client_interactions(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_interactions TO authenticated;
GRANT ALL ON public.client_interactions TO service_role;

ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WS members read interactions" ON public.client_interactions FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));
CREATE POLICY "WS members insert interactions" ON public.client_interactions FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));
CREATE POLICY "Author or admin update interactions" ON public.client_interactions FOR UPDATE TO authenticated
  USING ((author_id = auth.uid() OR has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role)) AND is_workspace_active(workspace_id));
CREATE POLICY "Author or admin delete interactions" ON public.client_interactions FOR DELETE TO authenticated
  USING ((author_id = auth.uid() OR has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role)) AND is_workspace_active(workspace_id));

CREATE TRIGGER trg_interactions_updated BEFORE UPDATE ON public.client_interactions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4) client_feedback (NPS)
CREATE TABLE IF NOT EXISTS public.client_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  video_id uuid REFERENCES public.videos(id) ON DELETE SET NULL,
  nps integer NOT NULL CHECK (nps BETWEEN 0 AND 10),
  comment text,
  submitted_via text NOT NULL DEFAULT 'portal',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_ws ON public.client_feedback(workspace_id);
CREATE INDEX IF NOT EXISTS idx_feedback_client ON public.client_feedback(client_id);
CREATE INDEX IF NOT EXISTS idx_feedback_video ON public.client_feedback(video_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_feedback TO authenticated;
GRANT ALL ON public.client_feedback TO service_role;

ALTER TABLE public.client_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WS members read feedback" ON public.client_feedback FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));
CREATE POLICY "WS admins delete feedback" ON public.client_feedback FOR DELETE TO authenticated
  USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

-- 5) client_portal_tokens
CREATE TABLE IF NOT EXISTS public.client_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_client ON public.client_portal_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_ws ON public.client_portal_tokens(workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_portal_tokens TO authenticated;
GRANT ALL ON public.client_portal_tokens TO service_role;

ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WS admins manage tokens" ON public.client_portal_tokens FOR ALL TO authenticated
  USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id))
  WITH CHECK (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

-- 6) Portal function: retorna dados básicos do cliente + vídeos a partir de um token válido
CREATE OR REPLACE FUNCTION public.portal_resolve_token(_token text)
RETURNS TABLE(client_id uuid, workspace_id uuid, client_name text, client_company text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.workspace_id, c.name, c.company
  FROM public.client_portal_tokens t
  JOIN public.clients c ON c.id = t.client_id
  WHERE t.token = _token
    AND t.revoked_at IS NULL
    AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.portal_resolve_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_list_videos(_token text)
RETURNS TABLE(id uuid, title text, description text, status video_status, due_date date, updated_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT v.id, v.title, v.description, v.status, v.due_date, v.updated_at
  FROM public.videos v
  WHERE v.client_id = (SELECT client_id FROM public.portal_resolve_token(_token))
  ORDER BY v.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.portal_list_videos(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_submit_feedback(_token text, _video_id uuid, _nps integer, _comment text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_ws uuid;
  v_id uuid;
BEGIN
  SELECT client_id, workspace_id INTO v_client, v_ws FROM public.portal_resolve_token(_token);
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  IF _nps < 0 OR _nps > 10 THEN
    RAISE EXCEPTION 'nps out of range';
  END IF;
  INSERT INTO public.client_feedback(workspace_id, client_id, video_id, nps, comment, submitted_via)
  VALUES (v_ws, v_client, _video_id, _nps, _comment, 'portal')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_submit_feedback(text, uuid, integer, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_approve_video(_token text, _video_id uuid, _comment text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_ws uuid;
BEGIN
  SELECT client_id, workspace_id INTO v_client, v_ws FROM public.portal_resolve_token(_token);
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  UPDATE public.videos SET status = 'aprovado' WHERE id = _video_id AND client_id = v_client;
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (NULL, 'video', _video_id, v_client, 'client_approved', jsonb_build_object('comment', _comment), v_ws);
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_approve_video(text, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_request_changes(_token text, _video_id uuid, _comment text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client uuid;
  v_ws uuid;
BEGIN
  SELECT client_id, workspace_id INTO v_client, v_ws FROM public.portal_resolve_token(_token);
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  UPDATE public.videos SET status = 'alteracoes' WHERE id = _video_id AND client_id = v_client;
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (NULL, 'video', _video_id, v_client, 'client_requested_changes', jsonb_build_object('comment', _comment), v_ws);
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_request_changes(text, uuid, text) TO anon, authenticated;
