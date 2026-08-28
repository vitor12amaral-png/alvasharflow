
CREATE TABLE public.whatsapp_channels (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'meta',
  phone_number_id text,
  display_number text,
  access_token text,
  verify_token text,
  api_base text,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_channels TO authenticated;
GRANT ALL ON public.whatsapp_channels TO service_role;
ALTER TABLE public.whatsapp_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_channels_admin_read" ON public.whatsapp_channels FOR SELECT TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));
CREATE POLICY "wa_channels_admin_write" ON public.whatsapp_channels FOR ALL TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'))
  WITH CHECK (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin') AND public.is_workspace_active(workspace_id));

CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  wa_phone text NOT NULL,
  contact_name text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'aberta',
  unread_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, wa_phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_conv_member_read" ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wa_conv_member_insert" ON public.whatsapp_conversations FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "wa_conv_member_update" ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "wa_conv_admin_delete" ON public.whatsapp_conversations FOR DELETE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  body text,
  media_url text,
  media_type text,
  status text NOT NULL DEFAULT 'enviado',
  provider_message_id text,
  author_id uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_messages_conv_idx ON public.whatsapp_messages(conversation_id, sent_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_msg_member_read" ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "wa_msg_member_insert" ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND public.is_workspace_active(workspace_id));
CREATE POLICY "wa_msg_admin_delete" ON public.whatsapp_messages FOR DELETE TO authenticated
  USING (public.has_workspace_min_role(auth.uid(), workspace_id, 'admin'));

CREATE TRIGGER whatsapp_channels_updated_at BEFORE UPDATE ON public.whatsapp_channels
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
