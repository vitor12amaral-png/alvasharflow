CREATE OR REPLACE FUNCTION public.invite_info(_token text)
RETURNS TABLE(workspace_id uuid, workspace_name text, email text, role workspace_role, expires_at timestamptz, accepted boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.workspace_id, w.name, i.email, i.role, i.expires_at, (i.accepted_at IS NOT NULL)
  FROM public.workspace_invites i
  JOIN public.workspaces w ON w.id = i.workspace_id
  WHERE i.token = _token
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.invite_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_info(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_workspace_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.workspace_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_inv FROM public.workspace_invites WHERE token = _token;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'convite invalido';
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'convite ja utilizado';
  END IF;
  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'convite expirado';
  END IF;

  INSERT INTO public.workspace_members(workspace_id, user_id, role, invited_by)
  VALUES (v_inv.workspace_id, auth.uid(), v_inv.role, v_inv.invited_by)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE public.workspace_invites SET accepted_at = now() WHERE id = v_inv.id;
  UPDATE public.profiles SET current_workspace_id = v_inv.workspace_id WHERE id = auth.uid();

  INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'editor') ON CONFLICT DO NOTHING;

  RETURN v_inv.workspace_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_workspace_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(text) TO authenticated;