
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'editor');
CREATE TYPE public.workspace_plan AS ENUM ('trial', 'active', 'suspended');
CREATE TYPE public.marketing_channel AS ENUM ('instagram', 'tiktok', 'youtube', 'linkedin', 'outro');
CREATE TYPE public.marketing_status AS ENUM ('ideia', 'roteiro', 'gravado', 'publicado');
CREATE TYPE public.task_status AS ENUM ('aberta', 'concluida');
ALTER TYPE public.package_status ADD VALUE IF NOT EXISTS 'concluido';

CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.workspace_plan NOT NULL DEFAULT 'trial',
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'editor',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_wm_user ON public.workspace_members(user_id);
CREATE INDEX idx_wm_workspace ON public.workspace_members(workspace_id);

CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'editor',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id uuid, _workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id);
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id uuid, _workspace_id uuid, _role public.workspace_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.workspace_members WHERE user_id = _user_id AND workspace_id = _workspace_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_min_role(_user_id uuid, _workspace_id uuid, _min public.workspace_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.user_id = _user_id AND m.workspace_id = _workspace_id
      AND (
        (_min = 'editor')
        OR (_min = 'admin' AND m.role IN ('owner','admin'))
        OR (_min = 'owner' AND m.role = 'owner')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_active(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id
      AND (w.plan = 'active' OR (w.plan = 'trial' AND w.trial_ends_at > now()))
  );
$$;

CREATE POLICY "Members read own workspaces" ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Owner updates workspace" ON public.workspaces FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can create own workspace" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members read own workspace members" ON public.workspace_members FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Admins manage members" ON public.workspace_members FOR ALL TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'))
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));

CREATE POLICY "Admins read invites" ON public.workspace_invites FOR SELECT TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins create invites" ON public.workspace_invites FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "Admins delete invites" ON public.workspace_invites FOR DELETE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));

ALTER TABLE public.clients ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.client_packages ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.videos ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.video_files ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.client_library ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.activity_log ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

DO $$
DECLARE
  v_admin uuid := 'dbfc3bfe-ad71-4f59-8f0e-14c6327bb4bf';
  v_ws uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_admin AND role = 'admin') THEN
    INSERT INTO public.workspaces (name, owner_id, plan, trial_ends_at)
    VALUES ('Meu workspace', v_admin, 'active', now() + interval '10 years')
    RETURNING id INTO v_ws;

    INSERT INTO public.workspace_members(workspace_id, user_id, role)
    VALUES (v_ws, v_admin, 'owner');

    UPDATE public.clients SET workspace_id = v_ws WHERE workspace_id IS NULL;
    UPDATE public.client_packages SET workspace_id = v_ws WHERE workspace_id IS NULL;
    UPDATE public.videos SET workspace_id = v_ws WHERE workspace_id IS NULL;
    UPDATE public.video_files SET workspace_id = v_ws WHERE workspace_id IS NULL;
    UPDATE public.client_library SET workspace_id = v_ws WHERE workspace_id IS NULL;
    UPDATE public.activity_log SET workspace_id = v_ws WHERE workspace_id IS NULL;
  END IF;
END $$;

DELETE FROM public.activity_log WHERE workspace_id IS NULL;
DELETE FROM public.video_files WHERE workspace_id IS NULL;
DELETE FROM public.videos WHERE workspace_id IS NULL;
DELETE FROM public.client_packages WHERE workspace_id IS NULL;
DELETE FROM public.client_library WHERE workspace_id IS NULL;
DELETE FROM public.clients WHERE workspace_id IS NULL;

ALTER TABLE public.clients ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.client_packages ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.videos ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.video_files ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.client_library ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.activity_log ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX idx_clients_ws ON public.clients(workspace_id);
CREATE INDEX idx_packages_ws ON public.client_packages(workspace_id);
CREATE INDEX idx_videos_ws ON public.videos(workspace_id);
CREATE INDEX idx_video_files_ws ON public.video_files(workspace_id);
CREATE INDEX idx_library_ws ON public.client_library(workspace_id);
CREATE INDEX idx_activity_ws ON public.activity_log(workspace_id);

ALTER TABLE public.profiles ADD COLUMN current_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

UPDATE public.profiles SET current_workspace_id = (
  SELECT id FROM public.workspaces WHERE owner_id = profiles.id LIMIT 1
) WHERE current_workspace_id IS NULL;

DROP POLICY IF EXISTS "Staff read all profiles" ON public.profiles;
CREATE POLICY "Members read teammate profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.workspace_members m1
      JOIN public.workspace_members m2 ON m1.workspace_id = m2.workspace_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
    )
  );

DROP POLICY IF EXISTS "Clients can view their own record" ON public.clients;
DROP POLICY IF EXISTS "Staff manage clients" ON public.clients;
CREATE POLICY "WS members read clients" ON public.clients FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "Client sees own record" ON public.clients FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "WS admins insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS admins update clients" ON public.clients FOR UPDATE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id))
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "WS admins delete clients" ON public.clients FOR DELETE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));

DROP POLICY IF EXISTS "Staff manage packages" ON public.client_packages;
CREATE POLICY "WS members read packages" ON public.client_packages FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS admins manage packages" ON public.client_packages FOR ALL TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id))
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));

DROP POLICY IF EXISTS "Staff manage videos" ON public.videos;
DROP POLICY IF EXISTS "Clients can view their own videos" ON public.videos;
CREATE POLICY "WS members read videos" ON public.videos FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "Client reads own videos" ON public.videos FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.user_id = auth.uid()));
CREATE POLICY "WS admins insert videos" ON public.videos FOR INSERT TO authenticated
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS admins update videos" ON public.videos FOR UPDATE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id))
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS admins delete videos" ON public.videos FOR DELETE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));
CREATE POLICY "Editor updates assigned videos" ON public.videos FOR UPDATE TO authenticated
  USING (editor_id = auth.uid() AND public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id))
  WITH CHECK (editor_id = auth.uid() AND public.is_workspace_active(workspace_id));

DROP POLICY IF EXISTS "Clients can view files of their own videos" ON public.video_files;
CREATE POLICY "WS members read files" ON public.video_files FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "Client reads own video files" ON public.video_files FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.videos v JOIN public.clients c ON c.id=v.client_id WHERE v.id = video_files.video_id AND c.user_id = auth.uid()));
CREATE POLICY "WS members manage files" ON public.video_files FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS members delete files" ON public.video_files FOR DELETE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));

CREATE POLICY "WS members read library" ON public.client_library FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS admins manage library" ON public.client_library FOR ALL TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id))
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));

CREATE POLICY "WS members read activity" ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  priority public.video_priority NOT NULL DEFAULT 'media',
  status public.task_status NOT NULL DEFAULT 'aberta',
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tasks_ws ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);

CREATE POLICY "WS members read tasks" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS members create tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "Task owner update" ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_workspace_active(workspace_id) AND (
      public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
      OR assignee_id = auth.uid()
      OR created_by = auth.uid()
    )
  ) WITH CHECK (public.is_workspace_active(workspace_id));
CREATE POLICY "Task admin delete" ON public.tasks FOR DELETE TO authenticated
  USING (
    public.is_workspace_active(workspace_id) AND (
      public.has_workspace_min_role(auth.uid(), workspace_id, 'admin')
      OR created_by = auth.uid()
    )
  );

CREATE TABLE public.marketing_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  channel public.marketing_channel NOT NULL DEFAULT 'instagram',
  status public.marketing_status NOT NULL DEFAULT 'ideia',
  body text,
  scheduled_for date,
  published_at date,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_scripts TO authenticated;
GRANT ALL ON public.marketing_scripts TO service_role;
ALTER TABLE public.marketing_scripts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ms_ws ON public.marketing_scripts(workspace_id);

CREATE POLICY "WS members read scripts" ON public.marketing_scripts FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS admins manage scripts" ON public.marketing_scripts FOR ALL TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id))
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));

CREATE TABLE public.marketing_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  note text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_references TO authenticated;
GRANT ALL ON public.marketing_references TO service_role;
ALTER TABLE public.marketing_references ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mr_ws ON public.marketing_references(workspace_id);

CREATE POLICY "WS members read refs" ON public.marketing_references FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "WS members manage refs" ON public.marketing_references FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));

CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_ms_updated BEFORE UPDATE ON public.marketing_scripts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ws_id uuid;
  v_ws_name text;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  v_ws_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'workspace_name',''), split_part(NEW.email,'@',1) || '''s workspace');

  INSERT INTO public.workspaces(name, owner_id, plan, trial_ends_at)
  VALUES (v_ws_name, NEW.id, 'trial', now() + interval '30 days')
  RETURNING id INTO v_ws_id;

  INSERT INTO public.workspace_members(workspace_id, user_id, role)
  VALUES (v_ws_id, NEW.id, 'owner');

  UPDATE public.profiles SET current_workspace_id = v_ws_id WHERE id = NEW.id;

  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE owner_id = NEW.id) THEN
      INSERT INTO public.workspaces(name, owner_id, plan, trial_ends_at)
      VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'workspace_name',''), split_part(NEW.email,'@',1) || '''s workspace'),
              NEW.id, 'trial', now() + interval '30 days')
      RETURNING id INTO v_ws;
      INSERT INTO public.workspace_members(workspace_id, user_id, role) VALUES (v_ws, NEW.id, 'owner');
      UPDATE public.profiles SET current_workspace_id = v_ws WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmed();

CREATE OR REPLACE FUNCTION public.tg_log_client_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (auth.uid(), 'client', NEW.id, NEW.id, 'created',
          jsonb_build_object('name', NEW.name, 'company', NEW.company), NEW.workspace_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_log_package_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
  VALUES (auth.uid(), 'package', NEW.id, NEW.client_id, 'created',
          jsonb_build_object('size', NEW.size, 'total_videos', NEW.total_videos, 'price', NEW.price),
          NEW.workspace_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_log_video_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
    VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'created',
            jsonb_build_object('title', NEW.title, 'status', NEW.status), NEW.workspace_id);
    IF NEW.package_id IS NOT NULL THEN
      UPDATE public.client_packages SET videos_used = videos_used + 1 WHERE id = NEW.package_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
      VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'status_changed',
              jsonb_build_object('title', NEW.title, 'from', OLD.status, 'to', NEW.status), NEW.workspace_id);
    END IF;
    IF NEW.editor_id IS DISTINCT FROM OLD.editor_id THEN
      INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata, workspace_id)
      VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'assigned',
              jsonb_build_object('title', NEW.title, 'editor_id', NEW.editor_id), NEW.workspace_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
