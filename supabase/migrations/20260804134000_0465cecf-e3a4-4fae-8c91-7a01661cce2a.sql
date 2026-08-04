CREATE POLICY "WS editors manage library" ON public.client_library
FOR ALL TO authenticated
USING (has_workspace_min_role(auth.uid(), workspace_id, 'editor'::workspace_role) AND is_workspace_active(workspace_id))
WITH CHECK (has_workspace_min_role(auth.uid(), workspace_id, 'editor'::workspace_role) AND is_workspace_active(workspace_id));