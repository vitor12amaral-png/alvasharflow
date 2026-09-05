# Menos cliques: uma tela "Meu dia" para saber o que fazer agora

Hoje, para montar o dia você precisa: abrir o Workflow, escolher cliente, mover demandas para "Fila", abrir cada vídeo e marcar a data de hoje, e ainda conferir a Semana. São quatro passos para uma pergunta simples: "o que eu edito agora?".

A proposta é inverter isso: o sistema monta o dia sozinho e você só confirma.

## 1. Nova tela inicial "Meu dia"

Vira a primeira coisa que abre ao entrar no app (e o primeiro item do menu).

- **Fila de hoje** — uma lista única, já ordenada, sem precisar escolher cliente: atrasados primeiro, depois o que vence hoje, depois o que está em edição, depois o próximo da fila geral. Mostra cliente/marca, prazo e tempo estimado.
- **Sugestão automática** — se você não marcou nada para hoje, o app já sugere os próximos itens (por prazo e prioridade) num bloco "Sugeridos para hoje", com um botão único **Adicionar ao meu dia** por item ou **Aceitar tudo**.
- **Total do dia** — soma do tempo estimado dos itens do dia, para saber se cabe.
- **Concluir em um clique** — cada linha tem "Comecei" (inicia o cronômetro e move para Editando) e "Pronto" (envia para Revisão/Aguardando cliente), sem abrir o vídeo.

## 2. Um clique em vez de vários

- **Arrastar para hoje/amanhã**: no Kanban e na Fila, arrastar um cartão (ou vários selecionados) para as faixas "Hoje", "Amanhã", "Esta semana" define o prazo direto.
- **Ações rápidas no cartão**: passar o mouse mostra três botões — hoje, começar, concluir — sem abrir o painel lateral.
- **Seleção múltipla sempre com barra de ação**: ao selecionar vários, aparece uma barra fixa embaixo com Hoje / Mover etapa / Prioridade / Marca / Excluir.
- **Teclado**: `H` marca hoje, `E` começa a editar, `Enter` conclui, setas navegam a lista.

## 3. Organização de demandas mais clara

- Reduzir o Kanban de 6 para 4 colunas visíveis por padrão: **A fazer** (recebido/briefing/fila), **Editando** (organização/editando), **Com o cliente** (enviado/revisão/alterações), **Concluído** (aprovado/entregue). As etapas detalhadas continuam existindo dentro do cartão, mas param de dividir a tela.
- As visões "Kanban / Fila / Semana" viram um único seletor claro: **Quadro · Dia · Semana** (a Fila vira o "Dia" e some a duplicidade Hoje/Fila geral).
- Filtro de cliente vira um seletor no topo, sem tela intermediária obrigatória — abre já em "Todos os clientes".

## 4. Refino visual

- Cartões mais compactos e legíveis: título, marca, prazo e estimativa numa hierarquia só; cor da etiqueta como faixa lateral em vez de fundo.
- Menos botões visíveis por padrão; ações secundárias no "…".
- Estados vazios que dizem o próximo passo em vez de "Nenhuma demanda".

## Notas técnicas

- Nova rota `src/routes/_authenticated/meu-dia.tsx` reaproveitando a consulta de vídeos já usada em `workflow.tsx`; "adicionar ao meu dia" grava `due_date = hoje` em lote (mesma mutação `patch` atual).
- Consolidação de colunas via reagrupamento em `GROUPS` (workflow.tsx), sem migração de banco — os status do enum continuam iguais.
- Ações rápidas reutilizam `useTimer`/`StopwatchConsole` e `DueDatePopover` existentes.
- Barra de ação em lote como componente novo compartilhado por Quadro, Dia e Semana.
- Sem mudanças de banco de dados nesta rodada.

## Ordem de execução

1. Tela "Meu dia" com sugestão automática e ações de um clique.
2. Barra de ação em lote + atalhos de teclado.
3. Consolidação das colunas do Quadro e do seletor de visões.
4. Refino visual dos cartões e estados vazios.
