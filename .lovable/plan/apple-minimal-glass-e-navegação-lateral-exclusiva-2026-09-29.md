# Apple Minimal Glass e navegação lateral exclusiva

## Objetivo
Aplicar ao sistema uma aparência Apple escura, limpa e translúcida, mantendo a leitura rápida e fazendo existir apenas um destaque azul por vez no menu lateral.

## Navegação lateral
- Separar visualmente “grupo aberto” de “página atual” para eliminar os dois estados azuis simultâneos.
- Ao clicar em Clientes, Trabalho, Conteúdo ou Gestão, esse grupo passa a ser o único destaque azul e todos os demais perdem o azul imediatamente.
- Manter somente um grupo expandido por vez; abrir um fecha o anterior.
- Ao escolher uma página interna, transferir o destaque principal para ela e manter seu grupo aberto sem duplicar o azul no cabeçalho.
- Tratar Dashboard e Configurações pela mesma regra exclusiva.
- Preservar localização secundária com contraste neutro e discreto quando necessário, sem competir com o destaque principal.

## Direção visual escolhida: Apple Minimal Glass
- Manter o tema escuro com fundos neutros profundos, azul funcional e tipografia limpa.
- Criar vidro fumê sutil com transparência, desfoque, bordas finas e brilho interno muito leve.
- Aplicar profundidade apenas onde existe uma camada real: menu lateral, cartões, barras, janelas, menus e controles.
- Evitar brilho neon, escalas perceptíveis, sombras pesadas, gradientes coloridos e excesso de cápsulas.
- Usar transições curtas e suaves, respeitando a preferência de movimento reduzido.

## Aplicação no sistema
- Consolidar os novos níveis de fundo, vidro, borda e sombra nos estilos compartilhados.
- Atualizar cartões e superfícies para o mesmo acabamento translúcido.
- Harmonizar botões, campos, seletores, abas e controles segmentados com estados discretos e consistentes.
- Refinar janelas, menus flutuantes e painéis laterais com vidro mais evidente apenas nessas camadas elevadas.
- Ajustar cabeçalhos e navegação móvel para seguir a mesma linguagem sem reduzir a legibilidade.
- Preservar estrutura, conteúdo, dados, cores de status e funcionamento atual das páginas.

## Validação
- Confirmar que nunca aparecem dois destaques azuis na lateral, inclusive ao abrir grupos diferentes partindo do Dashboard.
- Conferir estados fechado, aberto, página selecionada e troca entre grupos.
- Revisar Dashboard e telas representativas de Clientes, Workflow e Configurações em computador e celular.
- Verificar contraste, transparência, rolagem, janelas e controles nos temas escuro e claro.
- Confirmar ausência de sobreposições, erros visuais e erros de execução.

## Detalhes técnicos
- Substituir a regra atual baseada em `open || hasActive` por um único estado de seleção visual, mantendo expansão e rota como sinais independentes.
- Centralizar o acabamento Apple Minimal Glass em tokens e utilitários semânticos, propagando-o pelos componentes compartilhados em vez de estilizar cada página isoladamente.
- Manter cores funcionais existentes para sucesso, alerta, erro e gráficos; o vidro altera superfícies, não o significado dos dados.
