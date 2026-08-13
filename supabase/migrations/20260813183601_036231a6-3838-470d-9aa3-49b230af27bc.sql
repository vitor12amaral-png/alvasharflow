-- 1) Workspace active checks
DROP POLICY IF EXISTS "WS members insert activity" ON public.activity_log;
CREATE POLICY "WS members insert activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

DROP POLICY IF EXISTS "Admins create invites" ON public.workspace_invites;
CREATE POLICY "Admins create invites" ON public.workspace_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role)
    AND is_workspace_active(workspace_id)
    AND ((role <> 'owner'::workspace_role) OR has_workspace_role(auth.uid(), workspace_id, 'owner'::workspace_role))
  );

-- 2) Storage ownership helpers
CREATE OR REPLACE FUNCTION public.safe_uuid(_txt text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN _txt::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_team_access_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.workspace_members m ON m.workspace_id = c.workspace_id
    WHERE c.id = _client_id AND m.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.client_has_active_portal(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_portal_tokens t
    WHERE t.client_id = _client_id
      AND t.revoked_at IS NULL
      AND (t.expires_at IS NULL OR t.expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.can_team_access_client(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_team_access_client(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.client_has_active_portal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_has_active_portal(uuid) TO anon, authenticated;

-- 3) Scoped storage policies
DROP POLICY IF EXISTS "Portal uploads read" ON storage.objects;
DROP POLICY IF EXISTS "Portal uploads insert" ON storage.objects;
DROP POLICY IF EXISTS "Portal uploads delete by team" ON storage.objects;

CREATE POLICY "Portal uploads team read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'portal-uploads'
    AND public.can_team_access_client(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
  );

CREATE POLICY "Portal uploads team insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portal-uploads'
    AND public.can_team_access_client(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
  );

CREATE POLICY "Portal uploads team delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'portal-uploads'
    AND public.can_team_access_client(auth.uid(), public.safe_uuid((storage.foldername(name))[1]))
  );

CREATE POLICY "Portal uploads client read" ON storage.objects
  FOR SELECT TO anon
  USING (
    bucket_id = 'portal-uploads'
    AND public.client_has_active_portal(public.safe_uuid((storage.foldername(name))[1]))
  );

CREATE POLICY "Portal uploads client insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'portal-uploads'
    AND public.client_has_active_portal(public.safe_uuid((storage.foldername(name))[1]))
  );