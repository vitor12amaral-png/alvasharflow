## Objetivo
Substituir a página `/workflow` por uma tela dupla inspirada na referência: em cima um **kanban enxuto agrupado por cliente** dentro de cada estágio, embaixo uma **lista tabular** dos mesmos vídeos. Arrastar um card no topo muda o status na lista imediatamente (mesma fonte de dados, mesma mutation otimista).

## Mudanças

### 1. Estágios compactos (visual limpo)
Hoje temos 10 colunas — polui muito. Vou reduzir a visualização do kanban para **5 grupos** inspirados na referência, mapeando internamente os 10 status:

| Coluna visível | Status agrupados |
|---|---|
| Sem material | `recebido`, `briefing` |
| Em produção | `organizacao`, `fila`, `editando` |
| Enviado | `aguardando_cliente` |
| Em revisão | `revisao`, `alteracoes` |
| Aprovado | `aprovado`, `entregue` |

Ao soltar um card numa coluna, o status vai para o **primeiro** do grupo (ex.: soltar em "Em produção" → `organizacao`). A lista de baixo mostra o status real (10 estágios) com badge colorido.

### 2. Kanban por cliente (topo)
- Colunas: os 5 grupos acima, com pill colorido igual à referência.
- Dentro de cada coluna, cards **agrupados por cliente**: `Roney — 8 vídeos`, `Alef — 1 vídeo`. Cada card é arrastável e move **todos os vídeos daquele cliente naquela coluna** de uma vez.
- Botão "+" por coluna abre o dialog "Novo vídeo" já com o status pré-selecionado.

### 3. Lista sincronizada (base)
Tabela leve estilo Notion abaixo do kanban, colunas:
- Checkbox • Prazo • Título • Cliente • Situação (badge do status real) • Prioridade
- Ordenável por coluna, filtro rápido por cliente reaproveitando o select do topo.
- Editar status inline pelo badge (popover com os 10 estágios) — também dispara a mesma mutation.

### 4. Sincronia real
Ambas as views leem `videos-workflow` (react-query). A mutation `move` atualiza otimisticamente o cache, então **arrastar no topo re-renderiza a lista de baixo no mesmo frame** sem round-trip. Nenhum estado local duplicado.

### 5. Alternador de visualização
Barra superior estilo referência: `Histórico` · `Lista` · `Kanban` (default = ambos empilhados). "Lista" esconde o kanban, "Kanban" esconde a lista, o modo split é o padrão.

## Fora do escopo
- Não mexo em outros módulos (Dashboard, Clientes, etc.).
- Não altero o schema: continua com os 10 estágios no banco — o agrupamento é só visual.
- Não adiciono a coluna "Valor total" da referência (fluxo financeiro fica no módulo Financeiro).

## Validação
1. `/workflow` mostra kanban de 5 colunas em cima e lista embaixo.
2. Arrastar "Roney — 3 vídeos" de "Em produção" para "Em revisão" → os 3 vídeos do Roney na lista viram status `revisao` na mesma hora.
3. Trocar o status pelo badge da lista → o card correspondente pula de coluna no kanban.
4. Filtro de cliente afeta as duas views ao mesmo tempo.
