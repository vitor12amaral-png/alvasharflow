# Workflow mensal por cliente, sem perder pendências

## Objetivo

Organizar cada cliente por mês de produção no Workflow. A tela inicial passa a mostrar somente os números do mês selecionado; ao abrir um cliente, o mês pode ser trocado. Vídeos não concluídos de meses anteriores continuam visíveis em um bloco separado de **Pendências anteriores**, sem contaminar a leva do mês atual.

## Comportamento esperado

### Tela de clientes do Workflow
- Adicionar o seletor de mês no topo, mantendo o visual Apple Minimal Glass atual.
- Em cada cartão, mostrar os números daquele mês: quantidade da leva, concluídos e pendentes.
- Não somar todo o histórico no cartão, como acontece hoje.
- Em clientes-mãe, consolidar corretamente as demandas do cliente e de suas marcas.
- Manter “Todos os clientes” como visão consolidada do mesmo mês.

### Dentro do cliente
- Manter a troca de mês no cabeçalho e preservar o mês na URL para links e retornos.
- O quadro principal exibe somente as demandas pertencentes ao mês escolhido.
- Acima das visões Kanban, Fila e Semana, exibir um bloco **Pendências anteriores** quando existirem vídeos não concluídos de meses anteriores.
- Agrupar essas pendências por mês e cliente/marca, mostrando etapa, prazo e atraso.
- Permitir abrir e atualizar cada pendência normalmente; ao ser concluída, ela sai automaticamente do bloco.
- Concluídos de meses anteriores não aparecem como pendência. Continuam acessíveis ao navegar para o mês original.
- O pacote pode permanecer ativo e continuar recebendo novas levas em outubro mesmo que tenha começado em setembro; a virada do mês não encerra nem duplica o pacote.

## Regra de negócio robusta

Hoje o mês é inferido por `due_date ?? created_at`. Isso mistura prazo com competência: alterar o prazo pode mover o vídeo de mês sem intenção, e a escolha “Mês da leva” não fica registrada de forma independente.

Será criada uma competência mensal explícita para cada vídeo:

- `competence_month`: primeiro dia do mês escolhido, usado apenas para organização da leva.
- Novos vídeos e novas levas gravam o mês selecionado no Workflow.
- Alterar o prazo não altera a competência mensal.
- Alterar o mês será uma ação explícita, evitando mudanças acidentais.
- Dados existentes serão preenchidos com o comportamento atual (`due_date`, ou `created_at` quando não houver prazo), preservando a organização que o sistema já apresenta.
- O vínculo com `package_id` permanece independente: pacote, preço e consumo continuam intactos quando a competência muda.
- Subclientes continuam consumindo o pacote do cliente-mãe conforme a regra existente.

```text
Cliente: Roney
Mês selecionado: Outubro 2026

Pendências anteriores (3)
  Setembro (2)  Agosto (1)

Demandas de Outubro (10)
  Kanban | Fila | Semana
```

## Implementação

1. **Base mensal confiável**
   - Adicionar `competence_month` em `videos`, com preenchimento dos registros existentes e validação para guardar sempre o primeiro dia do mês.
   - Criar índice por workspace, cliente e competência para manter a consulta rápida.
   - Preservar permissões e políticas atuais; nenhuma tabela nova será criada.
   - Atualizar os tipos gerados pelo backend após a migration.

2. **Criação e edição**
   - Fazer “Nova leva” e “Novo vídeo” persistirem o mês selecionado, inclusive quando não houver prazo.
   - Manter prazo e mês como informações independentes.
   - Adicionar no detalhe do vídeo uma ação clara para corrigir o mês de competência quando necessário.
   - Garantir que criações pelo Copiloto/MCP também atribuam competência, usando o mês pedido ou o mês atual como padrão.

3. **Resumo mensal na escolha do cliente**
   - Consultar contagens por competência e situação, incluindo a hierarquia cliente-mãe/marcas.
   - Substituir os totais históricos dos cartões pelos números do mês selecionado.
   - Indicar separadamente quantas pendências anteriores existem, sem misturá-las no total mensal.

4. **Quadro do mês e bloco de pendências**
   - Separar os dados em `demandas do mês`, `pendências anteriores` e `outros meses`.
   - Alimentar Kanban, Lista, Fila e Semana somente com o mês selecionado.
   - Criar o bloco compartilhado de pendências anteriores acima da visão escolhida, com abertura do detalhe e ações normais de situação/prazo.
   - Recalcular corretamente concluídos, ocultos, busca e totais para que nenhum vídeo seja contado duas vezes.

5. **Pacotes que atravessam meses**
   - Exibir o pacote ativo como contexto, sem usar `start_date` ou `end_date` para esconder demandas.
   - Ao criar a leva de outubro, manter o mesmo pacote ativo quando ele ainda for o pacote vigente.
   - Não renovar, expirar ou consumir novamente o pacote durante a troca de mês.
   - Sinalizar inconsistências de dados existentes sem bloquear o Workflow, como pacote marcado ativo com data final já vencida.

6. **Consistência no sistema**
   - Usar a mesma competência nos pontos que criam ou listam vídeos, evitando divergência entre Workflow, perfil do cliente, Copiloto e MCP.
   - Manter calendário orientado por prazo e financeiro orientado por produção/valor; competência mensal não substituirá indevidamente essas datas.

## Validação

- Confirmar que, ao trocar setembro por outubro, o quadro mostra apenas a leva de outubro.
- Confirmar que vídeos incompletos de setembro aparecem uma única vez em **Pendências anteriores**.
- Concluir uma pendência e verificar que ela desaparece do bloco, mas continua no histórico de setembro.
- Alterar o prazo de um vídeo sem mudar seu mês de competência.
- Criar vídeo e leva em mês atual, passado e futuro, com e sem prazo.
- Validar cliente comum, cliente-mãe, marca e “Todos os clientes”.
- Confirmar que pacote ativo, contagem usada e preço não mudam apenas pela virada do mês.
- Validar desktop e celular, sem sobreposição, além de build, console e erros de execução.

## Detalhes técnicos

- Áreas principais: Workflow, seletor mensal, criação em lote, criação/edição de vídeo, perfil do cliente, Copiloto e ferramentas MCP de vídeo.
- A migration será aditiva e retrocompatível; o filtro antigo continuará representado no preenchimento inicial.
- A competência será um campo próprio porque `due_date` é prazo e `created_at` é data de cadastro; nenhum deles representa com segurança o mês comercial da leva.
