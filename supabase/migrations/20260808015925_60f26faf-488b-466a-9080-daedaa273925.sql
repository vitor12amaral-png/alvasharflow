-- 1) Tighten UPDATE WITH CHECK scopes

DROP POLICY IF EXISTS "Task owner update" ON public.tasks;
CREATE POLICY "Task owner update" ON public.tasks
FOR UPDATE TO authenticated
USING (
  is_workspace_active(workspace_id) AND (
    has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role)
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  )
)
WITH CHECK (
  is_workspace_member(auth.uid(), workspace_id)
  AND is_workspace_active(workspace_id)
  AND (
    has_workspace_min_role(auth.uid(), workspace_id, 'admin'::workspace_role)
    OR assignee_id = auth.uid()
    OR created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users update own time_entries" ON public.time_entries;
CREATE POLICY "Users update own time_entries" ON public.time_entries
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND is_workspace_active(workspace_id))
WITH CHECK (
  user_id = auth.uid()
  AND is_workspace_member(auth.uid(), workspace_id)
  AND is_workspace_active(workspace_id)
);

DROP POLICY IF EXISTS "Editor updates assigned videos" ON public.videos;
CREATE POLICY "Editor updates assigned videos" ON public.videos
FOR UPDATE TO authenticated
USING (
  editor_id = auth.uid()
  AND is_workspace_member(auth.uid(), workspace_id)
  AND is_workspace_active(workspace_id)
)
WITH CHECK (
  editor_id = auth.uid()
  AND is_workspace_member(auth.uid(), workspace_id)
  AND is_workspace_active(workspace_id)
);

-- 2) Internal SECURITY DEFINER functions must not be callable through the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_email_confirmed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_log_client_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_log_package_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_log_video_activity() FROM PUBLIC, anon, authenticated;

-- Workspace/role helpers are used inside RLS policies (evaluated as the caller),
-- so authenticated must keep EXECUTE, but anon never needs them.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_workspace_role(uuid, uuid, workspace_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_workspace_min_role(uuid, uuid, workspace_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_workspace_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, workspace_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_min_role(uuid, uuid, workspace_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_active(uuid) TO authenticated;

-- Invite acceptance requires a signed-in user only.
REVOKE ALL ON FUNCTION public.accept_workspace_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(text) TO authenticated;

-- Token-based public surfaces stay reachable (they validate the token internally).
REVOKE ALL ON FUNCTION public.invite_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_info(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_resolve_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_resolve_token(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_list_videos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_list_videos(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_approve_video(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_approve_video(text, uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_request_changes(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_request_changes(text, uuid, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_submit_feedback(text, uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_submit_feedback(text, uuid, integer, text) TO anon, authenticated;