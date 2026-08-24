# Conclusão integral do Workflow e da antiga Fila

## Objetivo

Transformar o Workflow no único centro operacional de demandas. A antiga Fila deixa de existir como aba independente e passa a ser uma visualização interna do Workflow, preservando suas funções úteis e eliminando a duplicação de lógica.

## O que a auditoria confirmou

- `/fila` ainda é uma página separada e continua no menu, na busca global e nas notificações.
- A visão Hoje/Fila geral/Semana, os KPIs diários, o quadro semanal e o valor semanal ainda vivem somente nessa página.
- O Workflow não abre a definição de prazo ao mover uma demanda sem prazo para “Em produção”.
- O Workflow não possui uma ação rápida completa de concluir nos cartões e grupos.
- O filtro mensal é opcional, mas o estado inicial ainda inclui demandas concluídas e a ordenação não segue prioridade + prazo como solicitado.
- Templates existem nas Configurações, porém não podem ser escolhidos ao criar uma demanda e não preenchem todos os padrões prometidos.
- O checklist aparece no detalhe, mas nenhuma transição para “Entregue” avisa sobre itens pendentes.
- A paleta de comandos pesquisa registros, mas não abre diretamente vídeos/tarefas nem oferece as ações rápidas de criação solicitadas.
- A central de notificações não cobre pacote próximo do limite, não mostra tempo relativo e notificações persistidas não navegam ao registro correspondente.
- O Financeiro mostra o preço total dos pacotes, mas não apresenta o valor efetivamente gerado pelos vídeos.

## Implementação

### 1. Unificar Workflow e Fila

- Criar no topo do Workflow um seletor principal com as visões `Kanban`, `Fila` e `Semana`.
- Manter o cliente selecionado, busca e filtros ao alternar entre as visões.
- Incorporar ao Workflow:
  - fila de hoje;
  - fila geral priorizada;
  - KPIs de atrasados, hoje, em edição e pendentes;
  - agrupamento por cliente;
  - ação “Puxar para hoje”;
  - alteração de situação e prazo por grupo;
  - `WeekBoard` com seleção múltipla, arrasto, edição rápida e criação;
  - botão único e reutilizado de “Nova leva”.
- Remover “Fila” do menu e da paleta de comandos.
- Fazer `/fila` apenas redirecionar para `/workflow?view=fila`, preservando links antigos sem manter uma segunda implementação.
- Atualizar notificações e demais links internos para abrir a visão correta dentro do Workflow.
- Consolidar queries e invalidações para que todas as visões usem a mesma fonte de dados.

### 2. Fechar o fluxo diário sem troca de tela

- Ao arrastar um vídeo ou grupo para “Em produção”, detectar quais itens ainda não têm prazo.
- Abrir imediatamente o seletor de prazo para esses itens; itens que já têm prazo não interrompem o fluxo.
- Permitir concluir/reabrir diretamente no cartão, na linha, no grupo e na seleção múltipla.
- Antes de entregar, verificar o checklist e exibir uma confirmação clara com os itens pendentes e opção explícita de continuar.
- Aplicar a mesma proteção em todos os caminhos do Workflow: arrasto, menu de status, lista, ação em massa, detalhe e visão semanal.

### 3. Corrigir filtros, ordenação e contexto

- Abrir o Workflow mostrando por padrão apenas demandas ativas, independentemente do mês.
- Ordenar por prioridade, depois prazo mais próximo e, por fim, ordem natural do título; itens sem prazo ficam por último.
- Manter “Mostrar concluídos” como opção explícita.
- Exibir contagem “no mês / fora do período” somente com o filtro mensal ligado.
- Persistir `view`, cliente e filtros relevantes na URL para que links, notificações e retornos preservem o contexto.

### 4. Completar visão semanal e cálculo financeiro

- Reutilizar o `WeekBoard` dentro do Workflow, sem duplicar mutations ou diálogo de leva.
- Separar corretamente:
  - agenda semanal por `due_date`;
  - receita gerada por vídeos criados no período (`created_at × price_per_video`).
- Mostrar quantidade e valor gerado da semana, com detalhamento por cliente.
- Fazer o Financeiro exibir receita gerada por vídeos, além do valor nominal dos pacotes, evitando confundir contrato com produção realizada.
- Manter o cálculo de subcliente usando o pacote/preço do cliente-mãe.

### 5. Completar templates de demanda

- Reaproveitar `project_templates` como fonte única, sem criar uma tabela concorrente.
- Completar a gestão em Configurações com criação, edição e exclusão de nome, prazo, prioridade, status, títulos e checklist.
- Adicionar seletor de template em “Novo vídeo” e “Nova leva”.
- Ao selecionar, preencher prazo, prioridade, status, títulos e checklist, mantendo todos os campos editáveis antes de salvar.
- Garantir que novos vídeos recebam uma cópia do checklist, sem compartilhar estado mutável com o template.

### 6. Completar a paleta de comandos

- Manter navegação integral por teclado.
- Adicionar ações fixas: Novo cliente, Novo vídeo, Nova tarefa, Dashboard e Workflow.
- Fazer resultados de cliente, vídeo, tarefa e lead abrirem o registro correto, não apenas a página genérica.
- Usar parâmetros de busca controlados para abrir o cliente/visão/detalhe sem perder contexto.

### 7. Completar a central de notificações

- Adicionar aviso de pacote próximo do limite com deduplicação.
- Manter avisos de vídeo aprovado/entregue, tarefa urgente e prazo próximo, garantindo escopo por usuário/workspace.
- Exibir tempo relativo e estado lido/não lido.
- Ao clicar, marcar como lida e navegar para o vídeo, tarefa ou cliente correspondente.
- Manter atualização em tempo real e corrigir todos os destinos que ainda apontam para a Fila separada.
- Aplicar qualquer ajuste necessário por migration, preservando RLS e GRANTs existentes.

## Validação obrigatória antes de concluir

- Validar build sem erros e ausência de erros de runtime/console.
- Testar em desktop e mobile, sem sobreposição de controles.
- Executar o fluxo completo com dados reais do ambiente de teste:
  1. abrir um cliente no Workflow;
  2. selecionar/arrastar um vídeo sem prazo para Em produção;
  3. confirmar abertura automática do prazo e salvamento;
  4. alternar para Fila sem perder cliente e filtros;
  5. concluir o vídeo, incluindo aviso de checklist pendente;
  6. alternar para Semana e mover múltiplos cartões;
  7. criar uma leva por template e conferir preço, pacote, checklist e Financeiro;
  8. abrir vídeo/tarefa pela paleta;
  9. abrir cada tipo de notificação no destino correto;
  10. acessar `/fila` e confirmar o redirecionamento para a visão interna.
- Conferir novamente cada requisito 13.1–13.6 contra o código e a interface. Nenhum item será declarado concluído apenas por existir parcialmente no código.

## Detalhes técnicos

- Principais arquivos: `workflow.tsx`, `fila.tsx`, `week-board.tsx`, `batch-videos-dialog.tsx`, `video-checklist.tsx`, `app-shell.tsx`, `command-palette.tsx`, `notification-center.tsx`, `configuracoes.tsx` e `financeiro.tsx`.
- A rota antiga será reduzida a compatibilidade por redirecionamento; o arquivo de rotas gerado não será editado manualmente.
- As transições de status passarão por uma única função de domínio para aplicar prazo automático e validação de checklist de forma consistente.
- Alterações no backend serão limitadas aos gatilhos/índices necessários para notificações; não haverá tabela paralela para Fila, checklist ou templates.
