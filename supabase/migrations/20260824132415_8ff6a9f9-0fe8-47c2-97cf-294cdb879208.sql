REVOKE EXECUTE ON FUNCTION public.notify_video_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_urgent_task() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_notifications_updated_at() FROM anon, authenticated, public;