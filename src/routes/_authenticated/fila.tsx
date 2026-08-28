import { createFileRoute, redirect } from "@tanstack/react-router";

/** Rota legada: a Fila agora é uma visão interna do Workflow. */
export const Route = createFileRoute("/_authenticated/fila")({
  beforeLoad: () => {
    throw redirect({
      to: "/workflow",
      search: { view: "fila", client: "all", month: undefined, video: undefined, new: undefined },
    });
  },
  component: () => null,
  head: () => ({
    meta: [
      { title: "Fila de produção — AlvasharFlow" },
      { name: "description", content: "Fila do dia e fila geral dos seus vídeos em produção." },
      { property: "og:title", content: "Fila de produção — AlvasharFlow" },
      { property: "og:description", content: "Acompanhe o que precisa ser editado hoje e a fila geral de demandas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
