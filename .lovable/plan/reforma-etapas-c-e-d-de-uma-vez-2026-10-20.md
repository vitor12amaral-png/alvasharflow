# Reforma — Etapas C e D de uma vez

Tudo o que ainda falta da lista de prioridades, entregue junto.

## O que vai mudar

1. **Motivo de parada**
   No cartão e no detalhe do vídeo, uma opção rápida para marcar por que ele parou: Aguardando material, Aguardando resposta do cliente, Dúvida no briefing ou Outro (com uma nota curta). O cartão ganha uma faixa âmbar com o motivo e um filtro rápido "Parados" no topo do Workflow. Ao tirar a marcação, o vídeo volta ao normal.

2. **Rodadas de revisão (v1, v2, v3)**
   Cada vez que um vídeo volta para "Alterações", a contagem sobe sozinha. O cartão mostra um selo pequeno "v2", "v3" e o histórico registra cada rodada. Vídeos com 3 ou mais rodadas ganham destaque.

3. **Carga por editor**
   Na Equipe, cada pessoa mostra horas estimadas em aberto, vídeos ativos e uma barra comparando com a capacidade semanal (padrão 40h, editável por pessoa). Ao escolher responsável num vídeo, a lista mostra a carga de cada um ao lado do nome.

4. **Aviso de prazo inviável**
   Quando um editor tem mais horas estimadas num dia do que cabe (padrão 8h), aparece um aviso vermelho na Equipe e no Workflow: "Fulano tem 11h para quinta".

5. **Cota do pacote sempre certa**
   A contagem de vídeos usados do pacote passa a ser recalculada automaticamente ao criar, mover entre pacotes ou excluir vídeos, e corrige os números atuais uma vez.

Nada disso apaga vídeos; o mês selecionado continua limpo.

## Detalhes técnicos

- Migration: `videos.block_reason text`, `videos.block_note text`, `videos.revision_count int default 0`; `workspace_members.weekly_capacity_hours numeric default 40`.
- Trigger em `videos`: incrementa `revision_count` quando `status` muda para `alteracoes`; o trigger de auditoria existente registra bloqueio/rodada no `activity_log`.
- Trigger em `videos` (insert/update de `package_id`/delete) recalcula `client_packages.videos_used = count(videos)`; backfill único na mesma migration.
- Regras de carga/prazo inviável em helper puro `src/lib/editor-load.ts` com testes (capacidade diária 8h, semanal configurável).
- UI: `workflow-operations.tsx` (motivo de parada, seletor de responsável com carga), `workflow.tsx` (filtro "Parados", selos), `equipe.tsx` (barras e alertas).
- Regenerar tipos, atualizar `roadmap.md` e `AGENTS.md`.
