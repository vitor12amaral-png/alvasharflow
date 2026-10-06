CREATE OR REPLACE FUNCTION public.reorder_workflow_videos(_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item jsonb; changed integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
 IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) > 500 THEN RAISE EXCEPTION 'Lista inválida'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_items) ORDER BY value->>'id' LOOP
  UPDATE public.videos SET position = (item->>'position')::integer,
    status = COALESCE((item->>'status')::public.video_status, status)
  WHERE id = (item->>'id')::uuid AND public.is_workspace_member(auth.uid(), workspace_id);
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'Vídeo indisponível'; END IF;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.reorder_workflow_videos(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_workflow_videos(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_log_video_operational_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changes jsonb := '{}'::jsonb; field text; before_row jsonb; after_row jsonb;
BEGIN
 IF TG_OP = 'DELETE' THEN
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (auth.uid(), 'video', OLD.id, OLD.client_id, 'deleted', jsonb_build_object('title', OLD.title), OLD.workspace_id);
  RETURN OLD;
 END IF;
 before_row := to_jsonb(OLD); after_row := to_jsonb(NEW);
 FOREACH field IN ARRAY ARRAY['title','description','due_date','due_time','competence_month','estimated_hours','position','priority','raw_files_link','final_file_link','batch_id','batch_label'] LOOP
  IF before_row->field IS DISTINCT FROM after_row->field THEN
   changes := changes || jsonb_build_object(field, jsonb_build_object('from', before_row->field, 'to', after_row->field));
  END IF;
 END LOOP;
 IF changes <> '{}'::jsonb THEN
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'operational_updated', jsonb_build_object('title', NEW.title, 'changes', changes), NEW.workspace_id);
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER trg_video_operational_audit AFTER UPDATE OR DELETE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.tg_log_video_operational_changes();
CREATE INDEX IF NOT EXISTS activity_log_video_history_idx ON public.activity_log (entity_id, created_at DESC) WHERE entity_type = 'video';