# Plano — alves.edt (revisão completa do documento)

Partes já implementadas em rodadas anteriores: 1.1 (navegação de mês), 1.7 (esqueci senha + reset), 2.1 (Tarefas), 2.2 (Marketing) e 3 (Copiloto).
Este plano cobre TUDO que ainda falta do documento, em uma única rodada. Parte 5 (WhatsApp) fica separada pois exige credenciais externas.

---

## Parte 0 — Rebranding "Cortex" → "alves.edt"

- Trocar nome e badge do logo (letra "A" no lugar do ícone atual) em `src/components/app-shell.tsx` (sidebar desktop + header mobile).
- Trocar `<title>` e meta tags em `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/auth.tsx`, `src/routes/reset-password.tsx`.
- Reescrever copy da landing `src/routes/index.tsx`:
  - Badge superior: "Feito para operações de alto volume".
  - Título com destaque colorido reforçando escala/refino.
  - Descrição focada em profissionais com muitos clientes/demandas simultâneas.
  - Manter botões "Entrar no painel" / "Ver módulos".
  - Remover a linha "primeiro usuário vira admin" (já é multi-tenant com trial).
- Atualizar system prompt do Copiloto e textos internos que citam "Cortex".

## Parte 1 — Correções restantes

**1.2 + 1.4 Briefing 100% editável**
- Migração: adicionar em `clients` as colunas `brand_colors jsonb`, `brand_fonts jsonb`, `brand_references jsonb` (default `'[]'::jsonb`) se faltarem.
- Em `clientes_.$clientId.tsx` aba Briefing: modo edição com botão "Editar/Salvar".
- Cores: color picker + hex, salvas como lista de tags removíveis.
- Fontes: input de tag removível.
- Referências: lista de itens (link ou texto) removíveis.
- Persistência via `clients.update` (policy UPDATE já cobre owner/admin do workspace).

**1.5 Revisão de todas as abas do perfil do cliente**
- Visão geral: garantir que todas as métricas exibidas vêm do banco.
- Vídeos: botão "Adicionar vídeo" funcional; contador do header reflete count real.
- Biblioteca: upload/adicionar item funcional; contador real.
- Financeiro: pacote ativo/valores calculados; registro simples de pagamento/ajuste.
- Histórico: eventos vindos do `activity_log` real (sem mocks).
- Remover ou implementar todo botão sem handler.

**1.6 Remover "Vídeos" da navegação principal**
- Remover item `/videos` do NAV desktop e mobile em `app-shell.tsx`.
- Manter rota e a aba "Vídeos" dentro do perfil do cliente.

## Parte 4 — Cronômetro de demandas

- Migração: tabela `time_entries` (workspace_id, user_id, video_id nullable, task_id nullable, started_at, ended_at nullable, duration_seconds computado, notes) + RLS por workspace + GRANTs.
- `TimerProvider` em `__root.tsx` persistindo sessão ativa em `localStorage` (e no banco quando finalizada).
- Badge flutuante fixo (canto inferior, ao lado do Copiloto) com tempo decorrido + Pausar/Finalizar, visível em todas as telas.
- Botão "Iniciar" no `VideoDetailSheet` e nos cards de tarefa.
- Bloqueio de dois timers simultâneos com prompt "pausar o atual?".
- Aba Histórico do cliente e detalhe do vídeo/tarefa mostrando sessões e total ("2h15 em 3 sessões").
- Painel de produtividade no dashboard e/ou tarefas: tempo médio por vídeo, cliente e editor.

## Parte 6 — Central de Links

- Migração: expandir `client_library` com `kind` (link|file), `url`, `category` (video_final, referencia, bruto, drive, roteiro, outro), `is_favorite`, `thumbnail_url`.
- Nova sub-aba "Links" dentro de Biblioteca no perfil do cliente:
  - Filtros por categoria, busca por nome, filtro de favoritos.
  - Adicionar link (URL + título + categoria) ou upload de arquivo (storage do Supabase).
  - Preview de thumbnail quando `image/*` (usa signed URL do storage) ou vídeo (poster gerado por Wistia/YT quando reconhecido).

## Parte 7 — Relacionamento com o cliente

- Migração:
  - `client_interactions` (client_id, tipo, data, notas, autor).
  - `client_feedback` (video_id, nps 0-10, comentário, criado_em).
  - `client_portal_tokens` (client_id, token, expires_at).
  - Função `SECURITY DEFINER` `portal_get_context(token)` para o portal público ler dados sem RLS do usuário.
- Nova aba "Relacionamento" no perfil do cliente:
  - CRUD de interações (reunião, ligação, mensagem).
  - Média de NPS destacada.
  - Botão "Gerar link do portal" (copia URL com token).
- Portal público em `src/routes/portal.$token.tsx` (sem gate de auth, SSR ok, público):
  - Lista de vídeos com status resumido (Em produção / Revisão / Aprovado / Entregue).
  - Botão "Aprovar" e "Solicitar ajuste" (comentário) → server routes públicas `/api/public/portal/*` validando token no handler.
  - Após vídeo marcado como Entregue, portal solicita NPS na próxima visita.
  - Layout mobile-first.

## Parte 5 — WhatsApp (fora deste ciclo)

Exige conta em provedor (Twilio, Z-API ou Meta Cloud API) + secret do usuário. Rodo em ciclo separado quando a credencial for fornecida.

---

## Detalhes técnicos

- Migração SQL única cobrindo: colunas de briefing em `clients`, colunas em `client_library`, tabelas `time_entries`, `client_interactions`, `client_feedback`, `client_portal_tokens`, função `portal_get_context`. Toda tabela com GRANTs + RLS por workspace + gate `is_workspace_active`.
- Timer: server fns `startTimer` / `stopTimer` com `requireSupabaseAuth`; UI local com tick a cada segundo.
- Portal público: rota TSS `portal.$token.tsx` (top-level, SSR) + endpoints `/api/public/portal/[token]/approve|comment|nps` validando token via função SECURITY DEFINER.
- Rebranding: só troca de textos/logo (frontend), sem migração.

## Fora do escopo

- Envio real por WhatsApp (Parte 5).
- E-mail automático do link do portal (usuário copia manualmente).
- Push notifications in-app.

## Validação

1. Landing exibe "alves.edt" com copy nova; título da aba e todas as menções trocadas.
2. Briefing edita e salva cores/fontes/referências e persiste após reload.
3. Sidebar sem "Vídeos"; abas do cliente 100% funcionais sem botões mortos.
4. Timer inicia num vídeo, badge persiste ao navegar, finaliza e soma no histórico; relatório de tempo por cliente/editor.
5. Central de Links: upload + link + favoritar + filtrar por categoria.
6. Portal público abre via token, cliente aprova vídeo e responde NPS; média aparece na Visão geral.
