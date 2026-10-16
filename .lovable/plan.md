# Reforma — Etapa B: saber o que fazer primeiro

Seguindo a ordem combinada (demandas e organização primeiro), as levas e os grupos por subcliente já estão prontos. A próxima entrega deixa claro, ao abrir o Workflow, por onde começar.

## O que vai mudar

1. **Filtros rápidos no topo do Workflow**
   Botões de um clique: Atrasados, Para hoje, Sem prazo, Sem responsável e Em revisão. Cada um mostra quantos vídeos tem. Clicar de novo desliga o filtro.

2. **Aprovado é diferente de entregue**
   No contador do mês aparecem "X aprovados aguardando entrega" e "Y entregues". Hoje os dois contam juntos como concluídos.

3. **Resumo do mês na tela de escolher cliente**
   Cada cliente mostra: vídeos do mês, entregues, atrasados e uma barrinha de progresso. Isso estava pendente na lista.

4. **Alternativa ao arrasto e uso no celular**
   No cartão, o botão de seta já permite mudar a etapa sem arrastar. No celular, as colunas passam a rolar para o lado, uma de cada vez, com o nome da etapa sempre visível.

5. **Seletor de mês e prazo da Nova leva**
   Conferir o que já existe e terminar a animação de abrir os meses e depois a data, com a opção "Sem prazo definido". Esse item também estava pendente.

O mês selecionado continua limpo: nada de demandas antigas aparecendo sozinhas.

## Depois desta etapa

- C: motivo de parada (aguardando material, aguardando cliente) e rodadas de revisão.
- D: carga de trabalho por editor e alerta de prazos inviáveis.

## Detalhes técnicos

- Os filtros rápidos são estado local derivado de `currentMonthVideos` e combinados com a busca e com a opção de ocultar concluídas. Não há nova consulta ao banco.
- Os contadores separam `status = 'aprovado'` de `status = 'entregue'`.
- O resumo por cliente usa uma única consulta agregada aos vídeos do mês, feita no seletor de clientes.
- No celular, o quadro usa `snap-x` com uma coluna por tela.
- Atualizar o `roadmap.md` (itens 11 e 14) e incluir um teste para a regra que separa aprovado de entregue.
