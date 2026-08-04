-- 1. Remove global-role cross-tenant policies
DROP POLICY IF EXISTS "Staff manage library" ON public.client_library;
DROP POLICY IF EXISTS "Staff manage video_files" ON public.video_files;

CREATE POLICY "WS members update files" ON public.video_files
FOR UPDATE TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id))
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND is_workspace_active(workspace_id));

-- 2. clients UPDATE WITH CHECK must also require active workspace
DROP POLICY IF EXISTS "WS admins update clients" ON public.clients;
CREATE POLICY "WS admins update clients" ON public.clients
FOR UPDATE TO authenticated
USING (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id))
WITH CHECK (has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role) AND is_workspace_active(workspace_id));

-- 3. Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_email_confirmed() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_log_client_activity() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_log_package_activity() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_log_video_activity() FROM anon, authenticated;

-- helper predicates: needed by RLS for signed-in users only
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_workspace_role(uuid, uuid, workspace_role) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_workspace_min_role(uuid, uuid, workspace_role) FROM anon;
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_workspace_active(uuid) FROM anon;

-- token resolver is internal to the portal functions
REVOKE ALL ON FUNCTION public.portal_resolve_token(text) FROM anon, authenticated;

-- keep only the intended public portal actions callable
GRANT EXECUTE ON FUNCTION public.portal_list_videos(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_approve_video(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_request_changes(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_submit_feedback(text, uuid, integer, text) TO anon, authenticated;