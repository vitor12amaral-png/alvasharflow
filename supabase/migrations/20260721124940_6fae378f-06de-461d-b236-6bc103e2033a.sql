
-- 1. Drop old
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.demand_comments CASCADE;
DROP TABLE IF EXISTS public.demands CASCADE;
DROP TYPE IF EXISTS public.demand_status CASCADE;
DROP TYPE IF EXISTS public.demand_priority CASCADE;

-- 2. New enums
CREATE TYPE public.video_status AS ENUM (
  'recebido','briefing','organizacao','fila','editando',
  'revisao','aguardando_cliente','alteracoes','aprovado','entregue'
);
CREATE TYPE public.video_priority AS ENUM ('baixa','media','alta','urgente');
CREATE TYPE public.delivery_method AS ENUM ('drive','dropbox','wetransfer','upload_interno');
CREATE TYPE public.package_size AS ENUM ('p10','p20','p30','custom');
CREATE TYPE public.package_status AS ENUM ('ativo','expirado','renovado','cancelado');
CREATE TYPE public.library_category AS ENUM ('bruto','exportado','logo','fonte','musica','lut','documento');

-- 3. Extend clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS delivery_method public.delivery_method,
  ADD COLUMN IF NOT EXISTS delivery_link TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_fonts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brand_references JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo';

DROP POLICY IF EXISTS "Client reads own record" ON public.clients;
DROP POLICY IF EXISTS "Admins manage clients" ON public.clients;

CREATE POLICY "Staff manage clients" ON public.clients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- 4. client_packages
CREATE TABLE public.client_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  size public.package_size NOT NULL DEFAULT 'p10',
  total_videos INTEGER NOT NULL DEFAULT 10,
  videos_used INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_day INTEGER,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status public.package_status NOT NULL DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_packages_client ON public.client_packages(client_id);
CREATE INDEX idx_packages_status ON public.client_packages(status);
CREATE INDEX idx_packages_end_date ON public.client_packages(end_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_packages TO authenticated;
GRANT ALL ON public.client_packages TO service_role;

ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage packages" ON public.client_packages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.client_packages
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. videos
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.client_packages(id) ON DELETE SET NULL,
  editor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.video_status NOT NULL DEFAULT 'recebido',
  priority public.video_priority NOT NULL DEFAULT 'media',
  due_date DATE,
  estimated_hours NUMERIC(6,2),
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_files_link TEXT,
  final_file_link TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_videos_client ON public.videos(client_id);
CREATE INDEX idx_videos_editor ON public.videos(editor_id);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_due ON public.videos(due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage videos" ON public.videos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE TRIGGER trg_videos_updated BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. video_files
CREATE TABLE public.video_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_video_files_video ON public.video_files(video_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_files TO authenticated;
GRANT ALL ON public.video_files TO service_role;

ALTER TABLE public.video_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage video_files" ON public.video_files
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- 7. client_library
CREATE TABLE public.client_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category public.library_category NOT NULL DEFAULT 'documento',
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_library_client ON public.client_library(client_id);
CREATE INDEX idx_library_category ON public.client_library(category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_library TO authenticated;
GRANT ALL ON public.client_library TO service_role;

ALTER TABLE public.client_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage library" ON public.client_library
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE TRIGGER trg_library_updated BEFORE UPDATE ON public.client_library
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 8. activity_log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_client ON public.activity_log(client_id);
CREATE INDEX idx_activity_entity ON public.activity_log(entity_type, entity_id);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Staff insert activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- 9. Activity triggers
CREATE OR REPLACE FUNCTION public.tg_log_video_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata)
    VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'created',
            jsonb_build_object('title', NEW.title, 'status', NEW.status));
    IF NEW.package_id IS NOT NULL THEN
      UPDATE public.client_packages SET videos_used = videos_used + 1 WHERE id = NEW.package_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata)
      VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'status_changed',
              jsonb_build_object('title', NEW.title, 'from', OLD.status, 'to', NEW.status));
    END IF;
    IF NEW.editor_id IS DISTINCT FROM OLD.editor_id THEN
      INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata)
      VALUES (auth.uid(), 'video', NEW.id, NEW.client_id, 'assigned',
              jsonb_build_object('title', NEW.title, 'editor_id', NEW.editor_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_videos_activity
  AFTER INSERT OR UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_video_activity();

CREATE OR REPLACE FUNCTION public.tg_log_client_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata)
  VALUES (auth.uid(), 'client', NEW.id, NEW.id, 'created',
          jsonb_build_object('name', NEW.name, 'company', NEW.company));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clients_activity
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_client_activity();

CREATE OR REPLACE FUNCTION public.tg_log_package_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_log(actor_id, entity_type, entity_id, client_id, action, metadata)
  VALUES (auth.uid(), 'package', NEW.id, NEW.client_id, 'created',
          jsonb_build_object('size', NEW.size, 'total_videos', NEW.total_videos, 'price', NEW.price));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_packages_activity
  AFTER INSERT ON public.client_packages
  FOR EACH ROW EXECUTE FUNCTION public.tg_log_package_activity();

-- 10. Policies for profiles + user_roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff read all profiles" ON public.profiles;
CREATE POLICY "Staff read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
