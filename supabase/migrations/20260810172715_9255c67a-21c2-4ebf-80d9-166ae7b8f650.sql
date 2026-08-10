-- workspace_members: prevent admin self-promotion to owner
DROP POLICY IF EXISTS "Admins manage members" ON public.workspace_members;

CREATE POLICY "Owners manage members"
ON public.workspace_members FOR ALL TO authenticated
USING (public.has_workspace_role(auth.uid(), workspace_id, 'owner'))
WITH CHECK (public.has_workspace_role(auth.uid(), workspace_id, 'owner'));

CREATE POLICY "Admins add non-owner members"
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (
  public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
  AND role <> 'owner'
);

CREATE POLICY "Admins update non-owner members"
ON public.workspace_members FOR UPDATE TO authenticated
USING (
  public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
  AND role <> 'owner'
)
WITH CHECK (
  public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
  AND role <> 'owner'
);

CREATE POLICY "Admins remove non-owner members"
ON public.workspace_members FOR DELETE TO authenticated
USING (
  public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
  AND role <> 'owner'
);

-- workspace_invites: only owners may invite owners
DROP POLICY IF EXISTS "Admins create invites" ON public.workspace_invites;

CREATE POLICY "Admins create invites"
ON public.workspace_invites FOR INSERT TO authenticated
WITH CHECK (
  public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
  AND (
    role <> 'owner'
    OR public.has_workspace_role(auth.uid(), workspace_id, 'owner')
  )
);

-- video_comments: only the author (or admins, or client-sourced comments) can be updated
DROP POLICY IF EXISTS "WS members update comments" ON public.video_comments;

CREATE POLICY "Authors or admins update comments"
ON public.video_comments FOR UPDATE TO authenticated
USING (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND public.is_workspace_active(workspace_id)
  AND (
    author_id = auth.uid()
    OR author_id IS NULL
    OR public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
  )
)
WITH CHECK (
  public.is_workspace_member(auth.uid(), workspace_id)
  AND public.is_workspace_active(workspace_id)
  AND (
    author_id = auth.uid()
    OR author_id IS NULL
    OR public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
  )
);