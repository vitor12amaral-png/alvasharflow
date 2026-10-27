# Reforma em passos

Cada passo é entregue, testado e mostrado para você antes de começar o próximo.

## Passo 1 — Planos na página de vendas
- Trocar os 3 planos inventados por: **Mensal R$ 69,90/mês**, **Trimestral** (valor um pouco menor por mês) e **Anual** (menor valor por mês).
- Sugestão inicial até você confirmar: Trimestral R$ 59,90/mês e Anual R$ 44,90/mês.
- Mesmo conteúdo em todos os planos (acesso completo); a diferença é só o período e o desconto.

## Passo 2 — Copiloto em bolinha de voz
- Uma bolinha no centro da tela que você toca uma vez e fala.
- Ela escuta, responde em voz alta e já executa a ação (criar leva, mudar prazo, mover etapa) sem clicar em "confirmar".
- Ações que apagam algo continuam pedindo confirmação falada ("sim").
- A bolinha muda de aparência quando está ouvindo, pensando e falando.

## Passo 3 — Aba Equipe como central dos editores
- Cada editor vira um cartão com suas demandas, carga da semana e atrasos.
- Botão "Adicionar leva para este editor": escolhe cliente, quantidade ou títulos, mês e prazo — os vídeos já nascem atribuídos a ele.
- Selecionar vários vídeos e passar de um editor para outro.
- Ver o que cada editor tem em andamento, parado e entregue.

## Passo 4 — Revisão aba por aba
- Passar por Clientes, Workflow, Calendário, Tarefas, Financeiro, Biblioteca, Marketing e Configurações.
- Para cada uma: o que está completo, o que falta e o que vale reformar.
- Você escolhe quais itens entram, e executamos aos poucos.

## Detalhes técnicos
- Passo 1: só `src/routes/index.tsx`.
- Passo 2: novo componente de orbe flutuante; reconhecimento de voz pt-BR do navegador, resposta por síntese de voz; reaproveita as ferramentas atuais do copiloto, removendo a etapa de confirmação para ações não destrutivas.
- Passo 3: `src/routes/_authenticated/equipe.tsx` reutilizando o formulário de Nova leva com o campo de responsável pré-preenchido e o helper de carga existente.
