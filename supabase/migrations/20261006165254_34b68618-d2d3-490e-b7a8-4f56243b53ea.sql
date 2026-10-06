CREATE OR REPLACE FUNCTION public.tg_log_video_operational_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changes jsonb := '{}'::jsonb; field text; before_row jsonb; after_row jsonb; surviving_client uuid;
BEGIN
 IF TG_OP = 'DELETE' THEN
  SELECT id INTO surviving_client FROM public.clients WHERE id = OLD.client_id;
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (auth.uid(), 'video', OLD.id, surviving_client, 'deleted', jsonb_build_object('title', OLD.title), OLD.workspace_id);
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
REVOKE ALL ON FUNCTION public.tg_log_video_operational_changes() FROM PUBLIC, anon, authenticated;