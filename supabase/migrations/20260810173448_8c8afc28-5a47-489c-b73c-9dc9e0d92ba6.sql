CREATE POLICY "Portal uploads insert"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'portal-uploads');

CREATE POLICY "Portal uploads read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'portal-uploads');

CREATE POLICY "Portal uploads delete by team"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'portal-uploads');

CREATE OR REPLACE FUNCTION public.portal_add_file(_token text, _video_id uuid, _name text, _url text, _file_type text, _size bigint)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_client uuid; v_ws uuid; v_id uuid;
BEGIN
  SELECT client_id, workspace_id INTO v_client, v_ws FROM public.portal_resolve_token(_token);
  IF v_client IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id = _video_id AND client_id = v_client) THEN
    RAISE EXCEPTION 'video not found';
  END IF;
  IF _url IS NULL OR _url !~* '^(https?://|storage:)' THEN RAISE EXCEPTION 'invalid url'; END IF;
  IF (SELECT count(*) FROM public.video_files
      WHERE workspace_id = v_ws AND created_at > now() - interval '1 hour') > 200 THEN
    RAISE EXCEPTION 'too many uploads';
  END IF;
  INSERT INTO public.video_files(workspace_id, video_id, name, url, file_type, size_bytes)
  VALUES (v_ws, _video_id, left(COALESCE(NULLIF(trim(_name), ''), 'arquivo'), 200),
          left(_url, 2000), left(_file_type, 100), _size)
  RETURNING id INTO v_id;
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (NULL, 'video', _video_id, v_client, 'client_uploaded_file',
          jsonb_build_object('name', _name), v_ws);
  RETURN v_id;
END;
$$;