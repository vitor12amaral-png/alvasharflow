-- =====================================================================
-- 1) WORKSPACE SETTINGS (branding + preferences)
-- =====================================================================
CREATE TABLE public.workspace_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_name text NOT NULL DEFAULT 'AlvasharFlow',
  brand_tagline text,
  logo_url text,
  logo_letter text,
  theme text NOT NULL DEFAULT 'dark',
  primary_color text NOT NULL DEFAULT '#38b6ff',
  accent_color text,
  radius text NOT NULL DEFAULT '0.75rem',
  whatsapp_number text,
  drive_folder_url text,
  package_alert_threshold integer NOT NULL DEFAULT 2,
  nps_enabled boolean NOT NULL DEFAULT true,
  portal_welcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read settings" ON public.workspace_settings
FOR SELECT TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "WS admins insert settings" ON public.workspace_settings
FOR INSERT TO authenticated
WITH CHECK (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

CREATE POLICY "WS admins update settings" ON public.workspace_settings
FOR UPDATE TO authenticated
USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id))
WITH CHECK (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

CREATE TRIGGER trg_ws_settings_updated BEFORE UPDATE ON public.workspace_settings
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- 2) PROJECT TEMPLATES
-- =====================================================================
CREATE TABLE public.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  default_status video_status NOT NULL DEFAULT 'recebido',
  default_priority video_priority NOT NULL DEFAULT 'media',
  due_in_days integer,
  estimated_hours numeric,
  titles jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_templates TO authenticated;
GRANT ALL ON public.project_templates TO service_role;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read templates" ON public.project_templates
FOR SELECT TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS members manage templates" ON public.project_templates
FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS members update templates" ON public.project_templates
FOR UPDATE TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id))
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS admins delete templates" ON public.project_templates
FOR DELETE TO authenticated
USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.project_templates
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- 3) VIDEO COMMENTS (timestamped, Frame.io style)
-- =====================================================================
CREATE TABLE public.video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  source text NOT NULL DEFAULT 'equipe',
  timestamp_seconds numeric,
  body text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_video_comments_video ON public.video_comments(video_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_comments TO authenticated;
GRANT ALL ON public.video_comments TO service_role;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read comments" ON public.video_comments
FOR SELECT TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS members create comments" ON public.video_comments
FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id) AND author_id = auth.uid());

CREATE POLICY "WS members update comments" ON public.video_comments
FOR UPDATE TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id))
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "Authors or admins delete comments" ON public.video_comments
FOR DELETE TO authenticated
USING (
  is_workspace_active(workspace_id)
  AND (author_id = auth.uid() OR has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role))
);

CREATE TRIGGER trg_video_comments_updated BEFORE UPDATE ON public.video_comments
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- 4) PUBLIC ONBOARDING FORM
-- =====================================================================
CREATE TABLE public.onboarding_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  label text,
  created_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_tokens TO authenticated;
GRANT ALL ON public.onboarding_tokens TO service_role;
ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS admins manage onboarding tokens" ON public.onboarding_tokens
FOR ALL TO authenticated
USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id))
WITH CHECK (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

CREATE TABLE public.onboarding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  instagram text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'novo',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_submissions TO authenticated;
GRANT ALL ON public.onboarding_submissions TO service_role;
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "WS members read submissions" ON public.onboarding_submissions
FOR SELECT TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS members update submissions" ON public.onboarding_submissions
FOR UPDATE TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id))
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

CREATE POLICY "WS admins delete submissions" ON public.onboarding_submissions
FOR DELETE TO authenticated
USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

CREATE TRIGGER trg_onb_sub_updated BEFORE UPDATE ON public.onboarding_submissions
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- 5) PUBLIC (TOKEN VALIDATED) RPCs
-- =====================================================================

-- Branding shown on the client portal / onboarding form
CREATE OR REPLACE FUNCTION public.portal_branding(_token text)
RETURNS TABLE(brand_name text, logo_url text, brand_tagline text, primary_color text, theme text, portal_welcome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(s.brand_name, 'AlvasharFlow'), s.logo_url, s.brand_tagline,
         COALESCE(s.primary_color, '#38b6ff'), COALESCE(s.theme, 'dark'), s.portal_welcome
  FROM public.client_portal_tokens t
  LEFT JOIN public.workspace_settings s ON s.workspace_id = t.workspace_id
  WHERE t.token = _token AND t.revoked_at IS NULL
    AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_comments(_token text, _video_id uuid)
RETURNS TABLE(id uuid, author_name text, source text, timestamp_seconds numeric, body text, resolved boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, COALESCE(c.author_name, 'Equipe'), c.source, c.timestamp_seconds, c.body, c.resolved, c.created_at
  FROM public.video_comments c
  JOIN public.videos v ON v.id = c.video_id
  WHERE c.video_id = _video_id
    AND v.client_id = (SELECT client_id FROM public.portal_resolve_token(_token))
  ORDER BY COALESCE(c.timestamp_seconds, -1), c.created_at;
$$;

CREATE OR REPLACE FUNCTION public.portal_add_comment(_token text, _video_id uuid, _seconds numeric, _body text, _author text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client uuid; v_ws uuid; v_id uuid;
BEGIN
  SELECT client_id, workspace_id INTO v_client, v_ws FROM public.portal_resolve_token(_token);
  IF v_client IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF _body IS NULL OR length(trim(_body)) = 0 THEN RAISE EXCEPTION 'empty comment'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id = _video_id AND client_id = v_client) THEN
    RAISE EXCEPTION 'video not found';
  END IF;
  INSERT INTO public.video_comments(workspace_id, video_id, author_name, source, timestamp_seconds, body)
  VALUES (v_ws, _video_id, COALESCE(NULLIF(trim(_author), ''), 'Cliente'), 'cliente',
          _seconds, left(trim(_body), 2000))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.onboarding_info(_token text)
RETURNS TABLE(workspace_id uuid, brand_name text, logo_url text, brand_tagline text, primary_color text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.workspace_id, COALESCE(s.brand_name, w.name), s.logo_url, s.brand_tagline,
         COALESCE(s.primary_color, '#38b6ff')
  FROM public.onboarding_tokens o
  JOIN public.workspaces w ON w.id = o.workspace_id
  LEFT JOIN public.workspace_settings s ON s.workspace_id = o.workspace_id
  WHERE o.token = _token AND o.revoked_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.onboarding_submit(
  _token text, _name text, _company text, _email text, _phone text, _instagram text, _payload jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid; v_id uuid;
BEGIN
  SELECT workspace_id INTO v_ws FROM public.onboarding_tokens
  WHERE token = _token AND revoked_at IS NULL LIMIT 1;
  IF v_ws IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;
  IF (SELECT count(*) FROM public.onboarding_submissions
      WHERE workspace_id = v_ws AND created_at > now() - interval '1 hour') > 50 THEN
    RAISE EXCEPTION 'too many submissions';
  END IF;
  INSERT INTO public.onboarding_submissions(workspace_id, name, company, email, phone, instagram, payload)
  VALUES (v_ws, left(trim(_name), 200), left(_company, 200), left(_email, 200),
          left(_phone, 60), left(_instagram, 120), COALESCE(_payload, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_branding(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_list_comments(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_list_comments(text, uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_add_comment(text, uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_add_comment(text, uuid, numeric, text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.onboarding_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.onboarding_info(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.onboarding_submit(text, text, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.onboarding_submit(text, text, text, text, text, text, jsonb) TO anon, authenticated;

-- Portal must also expose the final file link so clients can review video
DROP FUNCTION IF EXISTS public.portal_list_videos(text);
CREATE OR REPLACE FUNCTION public.portal_list_videos(_token text)
RETURNS TABLE(id uuid, title text, description text, status video_status, due_date date, updated_at timestamptz, final_file_link text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.title, v.description, v.status, v.due_date, v.updated_at, v.final_file_link
  FROM public.videos v
  WHERE v.client_id = (SELECT client_id FROM public.portal_resolve_token(_token))
  ORDER BY v.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.portal_list_videos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_list_videos(text) TO anon, authenticated;