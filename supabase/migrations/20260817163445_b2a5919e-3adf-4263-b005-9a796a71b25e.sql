DROP POLICY IF EXISTS "Portal uploads client read" ON storage.objects;
DROP POLICY IF EXISTS "Portal uploads client insert" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.client_has_active_portal(uuid) FROM anon;