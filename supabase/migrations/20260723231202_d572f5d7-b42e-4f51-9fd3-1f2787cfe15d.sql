
CREATE POLICY "Clients can view their own record"
ON public.clients FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Clients can view their own videos"
ON public.videos FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.clients c
  WHERE c.id = videos.client_id AND c.user_id = auth.uid()
));

CREATE POLICY "Clients can view files of their own videos"
ON public.video_files FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.videos v
  JOIN public.clients c ON c.id = v.client_id
  WHERE v.id = video_files.video_id AND c.user_id = auth.uid()
));
