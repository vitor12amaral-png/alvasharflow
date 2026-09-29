# Evolução mensal do Workflow e sistema de ações intuitivas

## Objetivo

Organizar o Workflow por competência mensal sem perder trabalhos em andamento e, em paralelo, criar um padrão de interação mais claro para ações recorrentes em todo o sistema. A primeira aplicação será a criação de levas, usando a direção visual escolhida **Apple glass interactive**.

## 1. Competência mensal confiável

Hoje o mês do vídeo é inferido por `prazo ou data de criação`. Isso mistura dois conceitos: alterar o prazo pode deslocar uma demanda para outro mês sem intenção, e o “Mês da leva” não fica registrado de forma independente.

- Adicionar em cada vídeo um mês de competência explícito, separado do prazo.
- Preencher os vídeos existentes usando a regra atual, preservando a organização já vista no sistema.
- Novas levas, vídeos individuais, Copiloto e MCP sempre gravam a competência escolhida.
- Alterar o prazo não altera o mês da leva.
- Alterar a competência será uma ação explícita no detalhe do vídeo.
- O vínculo com pacote, preço e consumo permanece independente; trocar o mês não renova, expira ou consome novamente o pacote.
- Clientes-mãe e marcas continuam usando a regra vigente de pacote compartilhado.

## 2. Workflow mensal por cliente

### Antes de abrir o cliente

- Colocar o seletor de mês no topo da tela mostrada na referência.
- Cada cartão passa a mostrar somente os números do mês selecionado: total, em andamento e concluídos.
- Mostrar à parte a quantidade de pendências anteriores, sem somá-la à leva do mês.
- Consolidar corretamente cliente-mãe e marcas.
- “Todos os clientes” usa a mesma competência mensal, em visão consolidada.

### Dentro do cliente

- Manter a troca de mês no cabeçalho e preservar cliente, mês e visualização na URL.
- Kanban, Lista, Fila e Semana mostram somente a leva do mês selecionado.
- Exibir acima delas um bloco **Pendências anteriores**, agrupado por mês e cliente/marca.
- Cada pendência mostra etapa, prazo e atraso e pode ser aberta ou atualizada normalmente.
- Ao concluir, ela sai automaticamente do bloco e permanece no histórico do mês original.
- Concluídos antigos nunca reaparecem como pendência.

```text
Roney — Outubro 2026

Pendências anteriores (3)
  Setembro (2)  Agosto (1)

Demandas de Outubro (10)
  Kanban | Fila | Semana
```

## 3. Novo seletor Apple glass interactive

Criar um componente reutilizável de **mês → prazo**, seguindo a direção aprovada:

- Estado fechado compacto, mostrando o mês da leva e o prazo atual.
- Ao tocar no mês, o controle cresce suavemente dentro do formulário.
- Exibir o mês anterior, o selecionado e o próximo, com navegação rápida e faixa horizontal acessível.
- Depois da escolha do mês, revelar o calendário visual desse mês.
- Oferecer **Sem prazo definido** de forma sempre visível; isso limpa apenas o prazo, não a competência.
- Incluir atalhos coerentes: Hoje, Amanhã e Próxima segunda quando fizer sentido.
- Usar o calendário visual já disponível no projeto, em vez do campo nativo inconsistente entre navegadores.
- Fechar a expansão após confirmar e mostrar um resumo claro: `Outubro 2026 · sem prazo` ou `Outubro 2026 · 18 out`.
- Animação curta de expansão/recolhimento, sem brilho excessivo e respeitando redução de movimento.
- Áreas de toque confortáveis e comportamento testado no celular.

A primeira integração será em **Nova leva de vídeos**. O mesmo componente será reutilizado nas etapas seguintes para evitar novas versões divergentes.

## 4. Pacotes que atravessam meses

- Um pacote ativo iniciado em setembro pode receber uma nova leva de outubro.
- A competência organiza as demandas; `start_date` e `end_date` não escondem vídeos automaticamente.
- Pendências de setembro continuam vinculadas ao pacote original e aparecem no bloco de pendências.
- Ao criar outubro, usar o pacote ativo vigente sem duplicar contagem ou preço.
- Sinalizar, sem bloquear o trabalho, pacotes marcados como ativos cuja data final já passou — há registros reais nessa situação.

## 5. Auditoria criteriosa de facilidade de uso

A análise confirmou padrões bons a preservar — identidade Apple Minimal Glass, componentes reutilizáveis, atalhos e ações rápidas — e fricções que devem ser corrigidas em ondas controladas.

### Onda A — ações essenciais e risco de perda de contexto

- **Workflow no celular:** substituir a dependência de colunas horizontais e arrasto por uma apresentação móvel legível.
- **Mover etapa sem arrastar:** adicionar ação clara “Mover para…” nos cartões; arrasto e atalhos continuam disponíveis.
- **Filtros transparentes:** separar contagens de fora do mês, concluídos ocultos e busca; nunca resumir tudo como “ocultos pelos filtros”.
- **Estados vazios úteis:** explicar o motivo e oferecer a próxima ação possível.
- **Exclusões críticas:** exigir confirmação reforçada para cliente/marca/pacote, diferente da exclusão simples de uma tarefa.

### Onda B — unificação de mês, data e filtros

- Reutilizar o seletor mensal no Calendário e persistir o mês na URL.
- Substituir gradualmente campos nativos de data nos fluxos operacionais pelo seletor expansível.
- Padronizar “Sem prazo”, “Indeterminado”, “Limpar” e atalhos de data.
- Criar um único controle para mostrar/ocultar concluídos, com a mesma linguagem e preferência em todas as telas.
- Reservar o menu de reticências para ações do item; filtros recebem ícone e rótulo próprios.

### Onda C — compreensão e prevenção de erro

- Tornar prazos vazios claramente clicáveis.
- Tornar “+N itens” no Calendário expansível.
- Melhorar a descoberta de marcas/subclientes na primeira utilização.
- Reordenar ações no cabeçalho móvel: criação e busca antes de opções secundárias.
- Substituir cores isoladas por tokens semânticos de aviso, sucesso e atraso.

## 6. Sequência de implementação

1. Migration de competência mensal, preenchimento retrocompatível e índice.
2. Tipos e gravação consistente em Nova leva, Novo vídeo, Copiloto e MCP.
3. Seletor Apple glass interactive em Nova leva, incluindo “Sem prazo”.
4. Resumo mensal nos cartões da entrada do Workflow.
5. Separação entre demandas do mês e Pendências anteriores em todas as visões.
6. Ajustes de contagem, busca, concluídos e pacote atravessando mês.
7. Onda A da auditoria, começando por Workflow mobile e ação “Mover para…”.
8. Ondas B e C, reutilizando os novos componentes em vez de redesenhar cada tela isoladamente.

## 7. Validação

- Virar setembro para outubro e confirmar que só a leva de outubro ocupa o quadro.
- Confirmar que pendências de setembro aparecem uma única vez no bloco separado.
- Concluir uma pendência e conferir sua saída do bloco e permanência no histórico.
- Alterar o prazo sem alterar a competência mensal.
- Criar levas em mês atual, passado e futuro, com data específica e sem prazo.
- Validar cliente comum, cliente-mãe, marca e “Todos os clientes”.
- Confirmar que pacote ativo, vídeos usados e valor não mudam apenas pela troca de mês.
- Testar seletor fechado, expandido, troca de mês, calendário e “Sem prazo” por teclado e toque.
- Validar Workflow e diálogos em desktop e celular, com redução de movimento.
- Conferir build, console, erros de execução e dados reais após a migration.

## Detalhes técnicos

- A alteração de dados será aditiva e retrocompatível; nenhuma tabela concorrente será criada.
- A competência será indexada por workspace, cliente e mês.
- Calendário continua orientado por prazo; Financeiro continua orientado por produção/valor. Competência organiza a leva e não substitui indevidamente essas datas.
- O seletor reutilizará os componentes de calendário, popover, diálogo e tokens de vidro existentes.
- A auditoria será implementada em ondas para manter o escopo verificável e evitar uma reforma visual indiscriminada.
