import { useSyncExternalStore } from "react";

/**
 * Estado global das ferramentas flutuantes (dock inferior direito).
 * Apenas uma ferramenta pode estar aberta por vez — quando uma abre,
 * os demais ícones somem para não competir por atenção.
 */
export type DockTool = "copilot" | "timer" | null;

let current: DockTool = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function openDock(tool: Exclude<DockTool, null>) {
  current = tool;
  emit();
}

export function closeDock() {
  current = null;
  emit();
}

export function toggleDock(tool: Exclude<DockTool, null>) {
  current = current === tool ? null : tool;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDock() {
  const open = useSyncExternalStore(
    subscribe,
    () => current,
    () => null as DockTool,
  );
  return {
    open,
    isOpen: (tool: Exclude<DockTool, null>) => open === tool,
    /** Ícone visível somente quando nada está aberto. */
    showLauncher: open === null,
    openDock,
    closeDock,
    toggleDock,
  };
}
