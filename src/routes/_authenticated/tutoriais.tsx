import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Play } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { restartTour } from "@/components/guided-tour";
import { TOURS } from "@/lib/tours";

export const Route = createFileRoute("/_authenticated/tutoriais")({
  head: () => ({ meta: [
    { title: "Tutoriais — AlvasharFlow" },
    { name: "description", content: "Passo a passo guiado de cada ferramenta do AlvasharFlow." },
    { property: "og:title", content: "Tutoriais — AlvasharFlow" },
    { property: "og:description", content: "Passo a passo guiado de cada ferramenta do AlvasharFlow." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TutorialsPage,
});

function TutorialsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tutoriais" subtitle="Escolha uma ferramenta e aprenda fazendo, com o passo a passo destacado na própria tela." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOURS.map((t) => (
          <Card key={t.id} className="card-ref flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <p className="font-display font-semibold tracking-tight">{t.title}</p>
              <span className="ml-auto text-xs text-muted-foreground">{t.steps.length} passos</span>
            </div>
            <p className="flex-1 text-sm text-muted-foreground">{t.description}</p>
            <Button size="sm" variant="outline" className="self-start" onClick={() => restartTour(t.id)}>
              <Play className="mr-1 h-3.5 w-3.5" />Começar
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
