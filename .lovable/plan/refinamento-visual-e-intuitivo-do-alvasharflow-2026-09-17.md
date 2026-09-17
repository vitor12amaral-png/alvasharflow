# Refinamento visual e intuitivo do AlvasharFlow

## Direção aprovada
- Tema escuro com azul elétrico, seguindo a direção **Modern dashboard interface**.
- **Space Grotesk** nos títulos e **DM Sans** no restante da interface.
- Estrutura compacta e operacional, inspirada no acabamento do FreelaFlow sem copiar sua identidade.
- Os screenshots enviados serão usados apenas como referência visual.

## O que será feito

### 1. Navegação lateral
- Reforçar a categoria atual com fundo azul translúcido, barra lateral luminosa, título e seta em azul.
- Aplicar leve expansão e brilho ao passar o mouse, sem deslocar ou sobrepor outros elementos.
- Manter somente uma categoria aberta e tornar seus itens internos mais fáceis de identificar.
- Melhorar a presença do Dashboard, Configurações, marca e área do usuário.
- Preservar a navegação móvel, ajustando seus estados ativos à mesma linguagem.

### 2. “Nova leva de vídeos”
- Reorganizar o formulário em uma sequência visual clara: cliente e modo, conteúdo, organização e prazos, resumo e criação.
- Melhorar título, separação das áreas, alinhamento, campos, seletores, foco e estado selecionado.
- Transformar o resumo em retorno visual imediato, destacando quantidade, títulos e valor previsto.
- Dar mais destaque ao botão final e manter todos os campos e regras atuais, sem transformar o fluxo em várias telas.
- Garantir boa adaptação em telas menores, evitando cortes em mês, prazo e textos longos.

### 3. Acabamento compartilhado no sistema
- Atualizar a base visual de botões, campos, seletores, abas, janelas e títulos de página para que o refinamento se propague pelas telas existentes.
- Padronizar estados de foco, seleção, passagem do mouse, carregamento e desabilitado.
- Usar brilho e movimento apenas como orientação, com transições rápidas e suporte à redução de movimento.
- Manter azul para navegação/ações e as cores funcionais existentes para sucesso, alerta e erro.

### 4. Aplicação cuidadosa
- Revisar as telas que mais reutilizam esses elementos e corrigir exceções visuais incompatíveis com o novo padrão.
- Não alterar regras de negócio, dados, permissões ou funcionamento dos módulos.
- Evitar reconstruções desnecessárias: o refinamento será centralizado nos elementos compartilhados e complementado onde a tela exigir.

### 5. Validação
- Conferir menu fechado/aberto, categoria e item ativos, estados de mouse e foco.
- Testar a criação de uma leva nos modos lista e quantidade, incluindo telas menores.
- Verificar páginas representativas do sistema em desktop e mobile para identificar cortes, sobreposições ou contraste insuficiente.
- Confirmar que a aplicação permanece sem erros.

## Detalhes técnicos
- Novos valores visuais serão registrados como tokens semânticos no tema global, incluindo superfícies, foco e brilho.
- A fonte do corpo será trocada de Inter para DM Sans no carregamento global.
- O refinamento priorizará os componentes compartilhados (`Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Tabs`, `Segmented`, cabeçalhos) e os dois pontos principais mostrados nas imagens.
