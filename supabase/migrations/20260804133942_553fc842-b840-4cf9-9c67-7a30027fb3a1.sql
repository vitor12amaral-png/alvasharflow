REVOKE ALL ON FUNCTION public.handle_email_confirmed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_workspace_min_role(uuid, uuid, workspace_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_workspace_role(uuid, uuid, workspace_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_active(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_resolve_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_clients_enforce_parent() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_log_client_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_log_package_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_log_video_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_min_role(uuid, uuid, workspace_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO authenticated;