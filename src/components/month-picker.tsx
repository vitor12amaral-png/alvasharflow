import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function useMonthFromSearch(): { year: number; month: number; ym: string; isCurrent: boolean } {
  const search = useSearch({ strict: false }) as { month?: string };
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const raw = typeof search.month === "string" && /^\d{4}-\d{2}$/.test(search.month) ? search.month : currentYm;
  const [y, m] = raw.split("-").map(Number);
  return { year: y, month: m - 1, ym: raw, isCurrent: raw === currentYm };
}

export function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end, startIso: start.toISOString(), endIso: end.toISOString() };
}

export function MonthPicker({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { year, month, isCurrent } = useMonthFromSearch();

  function go(delta: number) {
    const d = new Date(year, month + delta, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, month: ym }) as never, replace: true });
  }
  function goToday() {
    navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, month: undefined }) as never, replace: true });
  }

  const label = new Date(year, month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button variant="ghost" size="icon" onClick={() => go(-1)} title="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className={cn(
        "min-w-[160px] text-center font-display text-sm capitalize px-2 py-1 rounded-md",
        isCurrent && "bg-primary/10 text-primary font-semibold",
      )}>
        {label}
      </div>
      <Button variant="ghost" size="icon" onClick={() => go(1)} title="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrent && (
        <Button variant="outline" size="sm" onClick={goToday} className="ml-1 h-8">
          <CalendarDays className="mr-1 h-3 w-3" />Hoje
        </Button>
      )}
    </div>
  );
}
