
REVOKE EXECUTE ON FUNCTION public.tg_log_video_activity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_log_client_activity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_log_package_activity() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
