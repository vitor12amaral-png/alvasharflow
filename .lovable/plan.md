# Refinamento do Workflow e do Relacionamento

## Direção escolhida
- Aplicar a direção **Sleek Dashboard Flow**.
- Manter o visual escuro e funcional, com azul para seleção/ações e verde para conclusão.
- Usar hierarquia compacta e painel lateral, sem alterar regras de negócio.

## Entregas
1. **Visão Semana**
   - Transformar “Produção criada nesta semana” em um indicador compacto no canto.
   - Manter quantidade de vídeos e valor total visíveis, sem competir com o quadro semanal.

2. **Relacionamento do cliente**
   - Agrupar vídeos em “Em produção”, “Aguardando cliente” e “Concluídos”.
   - Exibir os grupos em uma lista compacta e abrir o vídeo selecionado em um painel lateral.
   - Mostrar situação, prazo, prioridade e um atalho direto para o vídeo no Workflow.

3. **Workflow → Relacionamento**
   - Adicionar no detalhe do vídeo um botão para abrir a aba Relacionamento do cliente.
   - Levar junto o vídeo selecionado para que a tela abra no item correto.

4. **Portal do cliente**
   - Adotar a lista compacta com painel lateral de detalhes como visão inicial.
   - Manter o quadro existente como alternativa.
   - Deixar explícito em cada cartão que ele pode ser aberto, sem prejudicar o arraste.

5. **Validação**
   - Conferir o fluxo autenticado entre Workflow e Relacionamento.
   - Conferir seleção, detalhes, upload e ações do portal em desktop e mobile.
   - Confirmar que a aplicação continua compilando sem erros.

## Detalhes técnicos
- Reutilizar os dados e ações atuais; nenhuma alteração de banco será necessária.
- Preservar os componentes e tokens visuais existentes, usando as cores semânticas do projeto.
- Atualizar os parâmetros de navegação para aceitar a aba e o vídeo selecionados.
