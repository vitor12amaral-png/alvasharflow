import { useMemo, useState } from "react";
import { addDays, addMonths, format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, Math.max(0, month - 1), 1);
}

function monthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function MonthDeadlinePicker({ month, dueDate, onMonthChange, onDueDateChange, className }: {
  month: string;
  dueDate: string;
  onMonthChange: (month: string) => void;
  onDueDateChange: (date: string) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedMonth = useMemo(() => parseMonth(month), [month]);
  const selectedDate = dueDate ? parseISO(dueDate) : undefined;
  const monthLabel = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR });
  const summary = dueDate
    ? `${monthLabel} · ${format(parseISO(dueDate), "d MMM", { locale: ptBR })}`
    : `${monthLabel} · sem prazo`;

  function chooseMonth(date: Date) {
    const next = monthValue(date);
    onMonthChange(next);
    if (dueDate && dueDate.slice(0, 7) !== next) onDueDateChange("");
  }

  function chooseQuick(date: Date) {
    chooseMonth(startOfMonth(date));
    onDueDateChange(localIso(date));
  }

  const today = new Date();
  const nextMonday = addDays(today, ((8 - today.getDay()) % 7) || 7);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border/70 bg-card/45 transition-[background-color,border-color] duration-200", expanded && "border-primary/30 bg-card/70", className)}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex min-h-12 w-full items-center gap-3 px-3 text-left transition hover:bg-muted/30"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><CalendarDays className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase text-muted-foreground">Mês da leva e prazo</span><span className="block truncate text-sm font-medium capitalize">{summary}</span></span>
        <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none", expanded && "rotate-90 text-primary")} />
      </button>

      <div className={cn("grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-border/60 p-3">
            <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
              <Button type="button" variant="ghost" size="icon" onClick={() => chooseMonth(addMonths(selectedMonth, -1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <div className="grid grid-cols-3 items-center gap-1 text-center">
                {[-1, 0, 1].map((delta) => {
                  const date = addMonths(selectedMonth, delta);
                  return <button type="button" key={delta} onClick={() => chooseMonth(date)} className={cn("rounded-md px-1 py-2 text-xs capitalize text-muted-foreground transition hover:bg-muted/50 hover:text-foreground", delta === 0 && "bg-primary/10 font-semibold text-primary ring-1 ring-inset ring-primary/20")}>{format(date, "MMM", { locale: ptBR })}<span className="ml-1 text-[9px] opacity-70">{format(date, "yy")}</span></button>;
                })}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => chooseMonth(addMonths(selectedMonth, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="flex flex-wrap content-start gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => chooseQuick(today)}>Hoje</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => chooseQuick(addDays(today, 1))}>Amanhã</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => chooseQuick(nextMonday)}>Próxima segunda</Button>
                <Button type="button" size="sm" variant={!dueDate ? "secondary" : "outline"} onClick={() => onDueDateChange("")}><InfinityIcon className="h-3.5 w-3.5" />Sem prazo definido</Button>
                <p className="w-full pt-1 text-[11px] leading-relaxed text-muted-foreground"><Clock3 className="mr-1 inline h-3 w-3" />O prazo pode ficar vazio sem alterar o mês da leva.</p>
              </div>
              <Calendar
                mode="single"
                month={selectedMonth}
                selected={selectedDate}
                onMonthChange={chooseMonth}
                onSelect={(date) => date && chooseQuick(date)}
                locale={ptBR}
                className="pointer-events-auto mx-auto rounded-md border border-border/60 bg-transparent p-2"
              />
            </div>
            <div className="mt-3 flex justify-end"><Button type="button" size="sm" onClick={() => setExpanded(false)}><Check className="h-3.5 w-3.5" />Confirmar</Button></div>
          </div>
        </div>
      </div>
    </div>
  );
}