# Plano — Fundação Completa: SaaS Agência de Edição

Refatoração ampla do que já existe. Removo o portal do cliente, evoluo o schema atual, e entrego os módulos-núcleo do PRD numa única entrega. Automações avançadas, notificações e "Central de Produção" ficam como camada de polimento numa próxima fase.

## Escopo desta entrega

**Módulos entregues:** Dashboard, Clientes (lista + página individual com abas), Onboarding Wizard, Demandas (Kanban do workflow 10 estágios + visão global), Biblioteca por cliente, Financeiro (pacotes/renovações), Equipe (básico), Calendário (leitura).

**Fora do escopo (fase 2):** Configurações avançadas, automações por regra, notificações in-app/email, upload real de arquivos grandes na biblioteca (fase 1 usa links externos + storage básico), métricas de produtividade da equipe, permissões granulares por editor.

## Mudanças de banco (uma migração)

**Novos enums:**
- `video_status`: `recebido, briefing, organizacao, fila, editando, revisao, aguardando_cliente, alteracoes, aprovado, entregue` (substitui `demand_status` atual)
- `delivery_method`: `drive, dropbox, wetransfer, upload_interno`
- `package_size`: `p10, p20, p30, custom`
- `app_role` estendido: `admin, editor` (remove `client`)

**Tabela `clients` — colunas novas:** `whatsapp`, `instagram`, `delivery_method`, `delivery_link`, `logo_url`, `brand_colors` (jsonb), `brand_fonts` (jsonb), `brand_references` (jsonb), `notes`.

**Nova tabela `client_packages`:** `client_id`, `size` (enum), `total_videos`, `price`, `payment_day`, `start_date`, `end_date`, `videos_used`, `status` (ativo/expirado/renovado). Um cliente pode ter histórico de pacotes.

**Tabela `demands` renomeada para `videos`:** herda dados atuais, novas colunas `package_id`, `editor_id` (fk profiles), `checklist` (jsonb), `estimated_hours`, `raw_files_link`, `final_file_link`, e enum de status substituído.

**Novas tabelas:**
- `video_files`: arquivos anexos a um vídeo (nome, url, tipo, tamanho)
- `client_library`: biblioteca por cliente (nome, url, categoria: bruto/exportado/logo/fonte/musica/lut/documento)
- `activity_log`: timeline global (actor_id, entity_type, entity_id, action, metadata, created_at) — alimenta dashboard e histórico do cliente
- `team_members`: view/tabela derivada dos profiles com role `editor` + capacidade e disponibilidade

**Descontinuados:** `invoices` (substituído por `client_packages` como fonte financeira), remoção de portal/role `client` (RLS refatorada para admin + editor).

Migração faz `DROP` das tabelas descontinuadas e cria as novas com GRANTs corretos e RLS admin/editor.

## Frontend — rotas e telas

**Novo shell:** navegação lateral estilo Linear (Dashboard, Clientes, Vídeos, Workflow, Equipe, Calendário, Biblioteca, Financeiro, Configurações). Portal do cliente removido.

**Rotas afetadas/criadas em `src/routes/_authenticated/`:**
- `dashboard.tsx` — reescrita: cards de KPI (clientes ativos, vídeos por status × 5, atrasados, total do mês), lista "Top clientes com pendências", "Próximos vencimentos de pacote", gráfico simples de vídeos/status, timeline (últimos 20 eventos do `activity_log`)
- `clientes.tsx` — lista + botão "Novo Cliente" abre Wizard (5 etapas: Dados → Plano → Entrega → Identidade Visual → Observações). Finalizar cria cliente + pacote inicial + registro no activity_log
- `clientes.$clientId.tsx` — nova página individual com abas: Visão Geral, Demandas, Biblioteca, Briefing (identidade visual), Financeiro (pacotes), Histórico
- `videos.tsx` — visão global de todos os vídeos com filtros (cliente, editor, status, prazo)
- `workflow.tsx` — Kanban de 10 colunas com drag-and-drop (dnd-kit já instalado). Suporta filtro por cliente
- `equipe.tsx` — lista de editores + carga de trabalho (vídeos ativos por editor)
- `calendario.tsx` — calendário mensal com prazos, vencimentos de pacote e pagamentos
- `biblioteca.tsx` — visão global agrupada por cliente
- `financeiro.tsx` — reescrita: lista de pacotes ativos, renovações próximas, valores a receber
- `configuracoes.tsx` — stub simples (perfil + logout)

**Remover:** `portal.tsx`, `portal.financeiro.tsx`, rotas dependentes.

## Camada de dados (server functions)

Novos arquivos `*.functions.ts` em `src/lib/`:
- `clients.functions.ts` — create (via wizard, transação: client + package + activity), list, get-by-id-with-relations, update
- `videos.functions.ts` — create, update-status (grava activity_log), list-with-filters, assign-editor
- `packages.functions.ts` — list-active, renew, upcoming-expirations
- `library.functions.ts` — list-by-client, add-item, delete
- `activity.functions.ts` — recent (dashboard timeline), by-client
- `team.functions.ts` — list-editors-with-load
- `dashboard.functions.ts` — agrega todos os KPIs em uma chamada

Padrão: `.middleware([requireSupabaseAuth])`, RLS aplica. Chamadas via TanStack Query com `queryOptions` + `ensureQueryData` no loader.

## Design

Mantém o dark premium atual, mas refinado no estilo Linear/Notion: densidade maior, tipografia mais compacta, sidebar fina com ícones + labels, tabelas com hover suave, Kanban com colunas coloridas por estágio, cards de KPI grandes com número + delta + micro-gráfico.

## Detalhes técnicos

- Wizard: componente próprio `client-wizard.tsx` com estado local + progresso, submit final chama uma única server fn transacional
- Drag-and-drop: `@dnd-kit/core` já no projeto, otimizar para 10 colunas com scroll horizontal
- Calendário: `react-day-picker` (já disponível via shadcn) para MVP; upgrade futuro se precisar de vista semanal
- Timeline do dashboard e histórico do cliente compartilham componente `activity-list.tsx`
- Todos os `activity_log` gravados via trigger no banco quando possível (INSERT/UPDATE de videos, packages) — reduz código na aplicação

## Ordem de execução

1. Migração (schema novo + drop antigo + RLS + triggers de activity_log)
2. Server functions
3. Shell + navegação + remoção do portal
4. Wizard e página individual do cliente
5. Workflow Kanban + Vídeos (visão global)
6. Dashboard visual
7. Equipe, Calendário, Biblioteca, Financeiro
8. Limpeza e verificação de build

## Riscos

- Migração é destrutiva (drop de `invoices`, mudança de enum de status). Confirmado pelo usuário: "manter e evoluir" — mas dados atuais em `demands` serão mapeados por melhor esforço para o novo enum, e faturas existentes serão perdidas (não havia lançamentos reais).
- 10 estágios de Kanban em telas médias exigem scroll horizontal — assumido como aceitável.
