-- Cliente ajusta prazo de um vídeo pelo portal
CREATE OR REPLACE FUNCTION public.portal_set_due_date(_token text, _video_id uuid, _due date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_client uuid; v_ws uuid;
BEGIN
  SELECT client_id, workspace_id INTO v_client, v_ws FROM public.portal_resolve_token(_token);
  IF v_client IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.videos WHERE id = _video_id AND client_id = v_client) THEN
    RAISE EXCEPTION 'video not found';
  END IF;
  IF _due IS NOT NULL AND (_due < current_date - 365 OR _due > current_date + 730) THEN
    RAISE EXCEPTION 'invalid date';
  END IF;
  UPDATE public.videos SET due_date = _due WHERE id = _video_id AND client_id = v_client;
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (NULL, 'video', _video_id, v_client, 'client_changed_due_date',
          jsonb_build_object('due_date', _due), v_ws);
END;
$$;

-- Cliente anexa arquivo a um vídeo
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
  IF _url IS NULL OR _url !~* '^https?://' THEN RAISE EXCEPTION 'invalid url'; END IF;
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

-- Cliente lista arquivos de um vídeo dele
CREATE OR REPLACE FUNCTION public.portal_list_files(_token text, _video_id uuid)
RETURNS TABLE(id uuid, name text, url text, file_type text, size_bytes bigint, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id, f.name, f.url, f.file_type, f.size_bytes, f.created_at
  FROM public.video_files f
  JOIN public.videos v ON v.id = f.video_id
  WHERE f.video_id = _video_id
    AND v.client_id = (SELECT client_id FROM public.portal_resolve_token(_token))
  ORDER BY f.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.portal_set_due_date(text, uuid, date) FROM public;
REVOKE ALL ON FUNCTION public.portal_add_file(text, uuid, text, text, text, bigint) FROM public;
REVOKE ALL ON FUNCTION public.portal_list_files(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.portal_set_due_date(text, uuid, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_add_file(text, uuid, text, text, text, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_files(text, uuid) TO anon, authenticated;