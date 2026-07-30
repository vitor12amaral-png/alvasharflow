import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Calendar, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { STAGE_LABEL, STAGE_ACCENT, PRIORITY_LABEL, PRIORITY_COLOR, VIDEO_STAGES } from "@/lib/video-workflow";
import type { VideoStatus, VideoPriority } from "@/lib/video-workflow";
import { formatDate, daysUntil } from "@/lib/format";
import { DeleteAction } from "@/components/delete-action";

export const Route = createFileRoute("/_authenticated/videos")({
  component: VideosPage,
  head: () => ({ meta: [{ title: "Vídeos — alves.edt" }] }),
});

function VideosPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [client, setClient] = useState<string>("all");

  const { data: clients } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  const { data: videos, isLoading } = useQuery({
    queryKey: ["videos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*, clients(name), profiles:editor_id(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (videos ?? []).filter((v) => {
    if (q && !v.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "all" && v.status !== status) return false;
    if (client !== "all" && v.client_id !== client) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Vídeos" subtitle={`${filtered.length} vídeo${filtered.length === 1 ? "" : "s"}`} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título…" className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {VIDEO_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={client} onValueChange={setClient}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {(clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="mt-6 p-10 text-center text-sm text-muted-foreground">Nenhum vídeo.</Card>
      ) : (
        <Card className="mt-6 divide-y divide-border">
          {filtered.map((v) => {
            const overdue = v.due_date && v.status !== "entregue" && v.status !== "aprovado" && (daysUntil(v.due_date) ?? 999) < 0;
            return (
              <div key={v.id} className="flex items-center gap-3 p-3">
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STAGE_ACCENT[v.status as VideoStatus] }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.title}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {v.clients?.name && <Link to="/clientes/$clientId" params={{ clientId: v.client_id }} className="hover:text-foreground hover:underline">{v.clients.name}</Link>}
                    {v.profiles?.full_name && <span>· {v.profiles.full_name}</span>}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]" style={{ borderColor: STAGE_ACCENT[v.status as VideoStatus] + "60", color: STAGE_ACCENT[v.status as VideoStatus] }}>
                  {STAGE_LABEL[v.status as VideoStatus]}
                </Badge>
                <span className={`text-[11px] font-semibold ${PRIORITY_COLOR[v.priority as VideoPriority]}`}>{PRIORITY_LABEL[v.priority as VideoPriority]}</span>
                {v.due_date && (
                  <span className={`inline-flex items-center gap-1 text-[11px] ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                    {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                    {formatDate(v.due_date)}
                  </span>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
