import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClients from "./tools/list-clients";
import listVideos from "./tools/list-videos";
import createVideo from "./tools/create-video";
import updateVideo from "./tools/update-video";
import createTask from "./tools/create-task";
import workspaceStats from "./tools/workspace-stats";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "alvasharflow",
  title: "AlvasharFlow",
  version: "0.1.0",
  instructions:
    "Ferramentas do AlvasharFlow — gestão de clientes, vídeos e tarefas para creators e editores. Use list_clients/list_videos para localizar registros antes de criar ou atualizar. Datas sempre em YYYY-MM-DD.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listClients, listVideos, createVideo, updateVideo, createTask, workspaceStats],
});
