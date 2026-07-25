
## Plano — Correções + Novas abas + Copiloto

Executo tudo em uma rodada, agrupando por área para reduzir migrations e retrabalho.

---

### PARTE 1 — Correções

**1.1 Navegação de mês (Workflow + Dashboard + Calendário)**
- Criar `src/components/month-picker.tsx` compartilhado com estado via URL (`?month=YYYY-MM`) e botões prev/next/hoje, destacando o mês corrente.
- Integrar em `workflow.tsx`, `dashboard.tsx`, `calendario.tsx` e financeiro; queries filtram por range `[início, fim]` do mês.
- Vídeos e pacotes já têm `created_at` — filtro por range resolve.

**1.2 Briefing do cliente editável**
- Em `clientes_.$clientId.tsx`, aba Briefing: converter campos read-only para inputs controlados com botão "Salvar", chamando `update` em `clients` (colunas de briefing/observações). Ajustar policy de UPDATE se necessário (owner/admin do workspace).

**1.3 Privacidade do feed de atividades**
- Ajustar a query do Dashboard: se `workspaceRole` for `editor`, filtrar `activity_log` por `actor_id = auth.uid()`; owner/admin vê tudo do workspace.
- Reforçar via RLS: policy SELECT em `activity_log` = (é owner/admin do workspace) OR (actor_id = auth.uid()).

**1.4 Esqueci minha senha**
- Adicionar link "Esqueci minha senha" em `src/routes/auth.tsx` → dialog pede email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`.
- Criar rota pública `src/routes/reset-password.tsx` que detecta `type=recovery` no hash, exige nova senha + confirmação (mín 8 chars) e chama `supabase.auth.updateUser({ password })`.

---

### PARTE 2 — Novas abas

**2.1 Tarefas (`/tarefas`)**
- Tabela `tasks` já existe. Expandir schema: adicionar `category` (enum: financeiro/atendimento/marketing/edicao/administrativo), `recurrence` (none/daily/weekly/monthly), `assignee_id` (já existe).
- Rota nova com toggle Kanban (A Fazer / Em Andamento / Concluído) e Agenda (Hoje/Amanhã/Esta semana/Próximas).
- Filtros: responsável, categoria, prioridade. Ordenação: prioridade + prazo. Destaque visual para atrasadas e vencendo hoje/amanhã.
- Item no sidebar (ícone CheckSquare).

**2.2 Marketing (`/marketing`)**
- Tabela `marketing_scripts` já existe — expandir com campos `hook`, `development`, `cta`, `technical_notes`, `content_type`.
- Nova tabela `marketing_content` (calendário editorial: título, tipo, data planejada, status, plataforma, cliente).
- Nova tabela `marketing_campaigns` (nome, objetivo, cliente, datas, orçamento, status) + junção `campaign_contents`.
- Rota com 3 sub-tabs: Roteiros / Calendário de Conteúdo / Campanhas. Calendário com views mensal e lista.
- Item no sidebar (ícone Megaphone).

---

### PARTE 3 — Copiloto IA

- Botão flutuante `Sparkles` fixo em todas as páginas autenticadas → Sheet lateral com chat.
- Backend: server route `src/routes/api/copilot.ts` com `streamText` (modelo `openai/gpt-5.5` via Lovable AI Gateway), `stopWhen: stepCountIs(50)`.
- Tools Zod-validadas, executadas via helpers server-only com `requireSupabaseAuth` (scope por workspace ativo):
  - `create_client`, `create_video`, `create_task`, `create_marketing_script`, `create_campaign`, `query_stats`.
  - Fuzzy match de cliente por nome; se ambíguo/faltando campo obrigatório, o modelo pergunta antes de executar.
  - Papel `editor` bloqueado em tools destrutivas de cadastro (retorno amigável).
- Frontend usa AI SDK `useChat` apontando pra `/api/copilot`; histórico em `localStorage` (uma conversa) + botão "Nova conversa".
- Após tool bem-sucedida: `queryClient.invalidateQueries` das chaves relevantes.

---

### Migração (única)

1. Enums: `task_category`, `task_recurrence`, `marketing_content_type`, `campaign_status`.
2. `ALTER TABLE tasks` add category, recurrence.
3. `ALTER TABLE marketing_scripts` add hook, development, cta, technical_notes, content_type.
4. `CREATE TABLE marketing_content`, `marketing_campaigns` (+ GRANTs + RLS scopadas ao workspace + gate `is_workspace_active`).
5. Policies de `activity_log`: SELECT restrita (editor vê só as próprias; admin/owner vê tudo do workspace).
6. Policy UPDATE em `clients` garantindo owner/admin do workspace.

---

### Fora do escopo
- Envio automático de convite de equipe (já planejado antes; foco agora é o pedido atual).
- Integração real com Instagram/TikTok em Marketing (só schema + UI).
- Recorrência automática de tarefas via cron (só o campo + próxima ocorrência gerada ao concluir).

### Validação
1. Prev/next mês em Workflow/Dashboard/Calendário reflete nos dados e URL.
2. Briefing edita e persiste após reload.
3. Login como editor vê apenas as próprias atividades; admin vê todas.
4. Reset de senha via email chega e a página `/reset-password` funciona.
5. Tarefa recorrente + filtros + Kanban/Agenda operam.
6. Marketing: cria roteiro, agenda conteúdo, cria campanha.
7. Copiloto: "cria cliente Ana plano 10 Drive" e "adiciona tarefa urgente revisar roteiro do X" executam e refletem na UI sem refresh.
