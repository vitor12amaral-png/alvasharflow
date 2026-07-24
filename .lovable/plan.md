## Objetivo
Além do sistema de meses, Tarefas, Marketing e Copiloto, transformar o Cortex em **SaaS multi-tenant** com cadastro aberto, verificação de email e trial de 30 dias que bloqueia acesso ao expirar. Cada editor tem seu próprio workspace isolado, com opção de convidar equipe.

---

## 1. Sistema de meses (Workflow + Dashboard)

- `MonthPicker` compartilhado com URL `?month=YYYY-MM` (search param + `fallback`).
- Vídeo pertence ao mês da sua `created_at` — histórico congelado, mas editável.
- Queries `videos-workflow` e `dashboard` filtram por range do mês.
- Botão **Fechar mês** (habilitado só com cliente selecionado): marca pacote como concluído, cria novo pacote, gera slots vazios, avança o MonthPicker.
- Badge "Ciclo fechado" em meses arquivados (não bloqueia edição).

---

## 2. Módulo Tarefas (`/tarefas`)

Aba nova no sidebar (ícone `CheckSquare`), estilo Linear/Things:
- Seções "Hoje", "Amanhã", "Próximos 7 dias", "Sem data", "Concluídas".
- Cada tarefa: checkbox, título inline, prazo, prioridade, cliente opcional.
- Input fixo no topo (`Enter` cria).
- Filtros: Todas / Minhas / por cliente.

Tabela `tasks` (title, description, due_date, priority, status, client_id?, assignee_id, workspace_id) com RLS scopada ao workspace + assignee. Card "Tarefas de hoje" no Dashboard.

---

## 3. Módulo Marketing (`/marketing`)

Aba nova (ícone `Megaphone`), 3 sub-abas:
- **Roteiros**: título, canal (Instagram/TikTok/YouTube/LinkedIn), status (`ideia|roteiro|gravado|publicado`), data prevista, corpo (textarea rich).
- **Ideias**: post-its, drag pra promover a roteiro.
- **Referências**: links salvos com nota.

Tabelas `marketing_scripts` e `marketing_references` scopadas ao workspace. Roteiros com `scheduled_for` aparecem no Calendário com badge roxo.

---

## 4. Copiloto (Lovable AI)

Botão flutuante `Sparkles` em todas páginas autenticadas → Sheet lateral com chat.

- Backend: server route `src/routes/api/copilot.ts` com `streamText` + tools, `stopWhen: stepCountIs(50)`, modelo `openai/gpt-5.5` via `LOVABLE_API_KEY`.
- Tools (Zod validated, executam dentro de `createServerFn` com `requireSupabaseAuth`, escopadas ao workspace):
  - `create_client`, `create_videos`, `update_video_status`, `create_task`, `create_marketing_script`, `query_stats`.
- Fuzzy match de nomes de clientes; se ambíguo, o modelo pergunta.
- Mutações destrutivas usam `needsApproval`.
- Histórico de UMA conversa em `localStorage`, botão "Nova conversa".
- Após tool bem-sucedida: `invalidateQueries` das chaves relevantes → UI atualiza sem refresh.

Exemplos: *"Cria cliente Ana plano 10 Drive"*, *"3 tarefas pra hoje: A, B, C"*, *"Roteiro Instagram bastidores"*.

---

## 5. Multi-tenant + Trial 30 dias + Convites de equipe

### 5.1 Estrutura de workspaces
Nova tabela `workspaces`:
- `id`, `name`, `owner_id` (FK auth.users), `trial_ends_at` (default `now() + 30d`), `plan` (`trial|active|suspended`), `created_at`.

Nova tabela `workspace_members`:
- `workspace_id`, `user_id`, `role` (enum novo: `owner|admin|editor`), `invited_by?`, `joined_at`.
- Único por `(workspace_id, user_id)`.

`profiles` ganha `current_workspace_id` (o workspace ativo do usuário). Todas as tabelas de dados (`clients`, `videos`, `client_packages`, `video_files`, `tasks`, `marketing_scripts`, `marketing_references`, `activity_log`) ganham `workspace_id NOT NULL`.

### 5.2 Papéis e permissões
- **owner**: acesso total, gerencia billing/trial, convida/remove membros.
- **admin**: acesso total operacional, convida editores (não remove owner).
- **editor**: acesso limitado — vê e edita **apenas vídeos/tarefas atribuídos a ele**, clientes em modo leitura, sem acesso a Financeiro/Configurações do workspace. Marketing: leitura.

Função `has_workspace_role(user_id, workspace_id, role)` (SECURITY DEFINER) usada nas policies. RLS de cada tabela: `workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())` + refinamento por papel para tabelas sensíveis.

### 5.3 Trial e bloqueio
Função `is_workspace_active(workspace_id) RETURNS boolean`:
```
SELECT plan = 'active' OR (plan = 'trial' AND trial_ends_at > now())
```
Todas as policies de **INSERT/UPDATE/DELETE** ganham `AND is_workspace_active(workspace_id)`.
Policies de **SELECT** ganham a mesma checagem → bloqueia leitura E escrita quando expira (escolha do usuário).

No app:
- Layout `_authenticated/route.tsx` carrega o workspace ativo. Se expirado: redireciona pra `/trial-expirado` — tela cheia com "Seu trial acabou" + copy de contato/renovação (sem botão de pagamento nesta rodada; renovação manual por admin via SQL).
- Banner amarelo no topo quando faltam ≤7 dias: "Trial expira em X dias".

### 5.4 Cadastro aberto + verificação de email
- `supabase--configure_auth`: `auto_confirm_email: false` (força verificação), `disable_signup: false`, `password_hibp_enabled: true`.
- Domínio de email da agência configurado (`email_domain--scaffold_auth_email_templates`) com template bonito para "Confirme seu email — Cortex".
- Google OAuth continua ativo como atalho (email já vem verificado).

Fluxo:
1. `/auth` — abas "Entrar" / "Criar conta". Signup pede: nome, email, senha, nome do workspace.
2. Após signup: tela "Verifique seu email" com botão "Reenviar".
3. Ao clicar no link do email → login automático → trigger cria workspace e adiciona o usuário como `owner` com `trial_ends_at = now() + 30d`.
4. Redireciona pro Dashboard.

Trigger `handle_new_user()` atualizado: quando `email_confirmed_at` fica preenchido pela primeira vez, cria `workspaces` (name = do signup metadata) + `workspace_members` (owner) + define `profiles.current_workspace_id`.

### 5.5 Convite de equipe
Nova rota `/equipe` (já existe, expandir):
- Lista membros do workspace com papel.
- Botão "Convidar editor" → dialog pede email + papel (`editor|admin`).
- Backend: `createServerFn` `invite_member` gera token, insere linha em nova tabela `workspace_invites` (`workspace_id, email, role, token, expires_at`, valida ownership do chamador), envia email transacional via `sendTemplateEmail('workspace-invite', ...)` com link `/aceitar-convite?token=...`.
- Rota pública `/aceitar-convite`: se logado → adiciona à `workspace_members` e troca `current_workspace_id`; se não → força login/signup primeiro.
- Seletor de workspace no header (dropdown com nome + botão "Trocar workspace") quando o usuário pertence a mais de um.

### 5.6 Copiloto e Editores
Copiloto respeita o papel: editor não pode chamar `create_client` (tool retorna erro amigável "Você não tem permissão para criar clientes"). Cada tool valida via `has_workspace_role` antes de executar.

---

## Migração (única, em ordem)

1. Criar enums `workspace_role`, valor `concluido` em `package_status`, `marketing_channel`, `marketing_status`.
2. Criar `workspaces`, `workspace_members`, `workspace_invites`.
3. Criar `tasks`, `marketing_scripts`, `marketing_references`.
4. Adicionar `workspace_id` (nullable temporário) em `clients`, `videos`, `client_packages`, `video_files`, `activity_log`.
5. **Backfill**: para cada admin atual existente, criar 1 workspace, associar todos os clientes/vídeos/etc dele, adicionar como owner, `plan='active'` (não trial — dados legados não expiram).
6. Tornar `workspace_id NOT NULL` + FKs.
7. Adicionar `current_workspace_id`, `trial_ends_at` em `profiles`.
8. Criar funções `has_workspace_role`, `is_workspace_active`.
9. Recriar RLS de todas as tabelas com escopo por workspace + gate de trial.
10. Atualizar trigger `handle_new_user` para criar workspace no primeiro email_confirmed.
11. GRANTs padrão em todas as tabelas novas.

## Fora do escopo
- Pagamento/checkout automático (Stripe). Renovação de trial nesta rodada é manual via SQL admin.
- Transferência de workspace entre owners.
- Auditoria de convites/logs de acesso além do `activity_log` já existente.
- Copiloto conectado a Financeiro/Biblioteca (adiciono depois).

## Validação
1. Cadastro com email novo → email de verificação chega → clicar cria workspace com trial 30d.
2. Novo usuário loga → só vê os próprios clientes; não vê os do outro workspace.
3. Owner convida editor@teste → editor recebe email, aceita, entra no workspace como `editor`.
4. Editor logado só vê vídeos atribuídos a ele; tenta criar cliente → bloqueado.
5. Setar `trial_ends_at = now() - 1d` num workspace → usuário redireciona pra `/trial-expirado` e queries retornam vazio.
6. Meses + Tarefas + Marketing + Copiloto funcionam scopados ao workspace ativo.
